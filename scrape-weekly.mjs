#!/usr/bin/env node
/**
 * MatPris – nationwide Sweden weekly scraper
 * Coverage: ALL of Sweden (not one city)
 *
 * Willys  → live API (national e-handel offers)
 * Coop    → live API (national TV/member offers)
 * Lidl    → leaflets.schwarz overview (national flyer metadata + PDF link)
 * ICA     → uses handla / previous export; writes Excel template if blocked
 *
 * Always writes: data/imports/<store>/<YYYY-Www>.csv
 * And tries:     data/imports/<store>/<YYYY-Www>.xlsx
 *
 * npm run scrape
 * npm run weekly   (= scrape + import)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const IMPORTS = path.join(ROOT, "data/imports");

const storesArg = process.argv.find((a) => a.startsWith("--stores="));
const STORES = storesArg
  ? storesArg.split("=")[1].split(",").map((s) => s.trim())
  : ["willys", "coop", "lidl", "ica"];

const COOP_KEY =
  process.env.COOP_SUBSCRIPTION_KEY || "3becf0ce306f41a1ae94077c16798187";

function isoWeek(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t - new Date(Date.UTC(y, 0, 1))) / 864e5 + 1) / 7);
  return `${y}-W${String(w).padStart(2, "0")}`;
}

function csvEscape(s) {
  const t = String(s ?? "").replace(/"/g, '""');
  return /[",\n]/.test(t) ? `"${t}"` : t;
}

async function writeOutputs(storeId, rows) {
  const week = isoWeek();
  const dir = path.join(IMPORTS, storeId);
  fs.mkdirSync(dir, { recursive: true });
  const base = path.join(dir, week);
  const header =
    "Namn,Varumärke/Storlek,Erbjudandepris,Ordinarie pris,Jämförpris,Produktlänk";
  const lines = [
    header,
    ...rows.map((r) =>
      [r.name, r.brand, r.offer, r.regular, r.unit, r.url || ""]
        .map(csvEscape)
        .join(",")
    ),
  ];
  fs.writeFileSync(base + ".csv", lines.join("\n") + "\n", "utf8");
  console.log(`  CSV  ${rows.length} → ${path.relative(ROOT, base)}.csv`);

  // Excel if exceljs is available
  try {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Erbjudanden");
    ws.columns = [
      { header: "Namn", key: "name", width: 40 },
      { header: "Varumärke/Storlek", key: "brand", width: 22 },
      { header: "Erbjudandepris", key: "offer", width: 16 },
      { header: "Ordinarie pris", key: "regular", width: 16 },
      { header: "Jämförpris", key: "unit", width: 16 },
      { header: "Produktlänk", key: "url", width: 50 },
    ];
    for (const r of rows) ws.addRow(r);
    ws.getRow(1).font = { bold: true };
    await wb.xlsx.writeFile(base + ".xlsx");
    console.log(`  XLSX ${rows.length} → ${path.relative(ROOT, base)}.xlsx`);
  } catch (e) {
    console.log(`  (xlsx skipped: ${e.message.split("\n")[0]})`);
  }
  return base;
}

async function fetchJson(url, headers = {}) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      Accept: "application/json",
      ...headers,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

/* ─── Willys (nationwide e-handel) ─── */
async function scrapeWillys() {
  const size = 50;
  let page = 0,
    pages = 1;
  const items = [];
  while (page < pages) {
    const data = await fetchJson(
      `https://www.willys.se/axfood/rest/v2/search/campaigns/online?q=2110&type=PERSONAL_GENERAL&page=${page}&size=${size}`,
      { Referer: "https://www.willys.se/erbjudanden/ehandel" }
    );
    pages = data.pagination?.numberOfPages ?? 1;
    for (const p of data.results || []) {
      const promo = (p.potentialPromotions || [])[0];
      const offerPrice =
        promo?.price?.formattedValue ||
        promo?.rewardLabel ||
        p.priceNoUnit ||
        p.price ||
        "";
      const name = [p.name, p.productLine2].filter(Boolean).join(" ").trim();
      if (!name || !offerPrice) continue;
      const code = String(p.code || p.mainProductCode || "").split("_")[0];
      items.push({
        name,
        brand: p.manufacturer || p.brandName || "",
        offer: String(offerPrice).replace(/\s+/g, " ").trim(),
        regular: p.comparePrice || p.price || "",
        unit: p.comparePriceUnit || p.priceUnit || "",
        url: code
          ? `https://www.willys.se/produkt/${encodeURIComponent(code)}`
          : "https://www.willys.se/erbjudanden/ehandel",
      });
    }
    page++;
  }
  return dedupe(items);
}

/* ─── Coop (nationwide) ─── */
async function scrapeCoop() {
  const data = await fetchJson(
    "https://external.api.coop.se/dke/offers/tv?api-version=v2&clustered=false",
    { "Ocp-Apim-Subscription-Key": COOP_KEY }
  );
  const items = [];
  for (const o of data || []) {
    const cluster = o.clusterInteriorOffers?.length
      ? o.clusterInteriorOffers
      : [o];
    for (const item of cluster) {
      const c = item.content || {};
      const p = item.priceInformation || {};
      const splash = (item.unifiedSplash || {}).value || "";
      let price = p.discountValue;
      const multi = String(splash).match(/(\d+)\s*för\s*(\d+)/i);
      if (multi) price = Number(multi[2]) / Number(multi[1]);
      else if (splash && price == null) {
        const m = String(splash).replace(",", ".").match(/(\d+(?:\.\d+)?)/);
        if (m) price = Number(m[1]);
      }
      const name = c.onlineProductName || c.title || c.parentTitle || "";
      if (!name || !(price > 0)) continue;
      const ean = item.externalId || "";
      items.push({
        name,
        brand: c.brand || "",
        offer: `${String(price).replace(".", ",")} kr`,
        regular: c.comparativePriceText || "",
        unit: c.amountInformation || p.unit || "",
        url: ean
          ? `https://www.coop.se/handla/varor/?q=${ean}`
          : "https://www.coop.se/butiker-erbjudanden/",
      });
    }
  }
  return dedupe(items);
}

/* ─── Lidl (nationwide flyer via Schwarz leaflets API) ─── */
async function scrapeLidl() {
  const ov = await fetchJson(
    "https://endpoints.leaflets.schwarz/v4/overview?client_locale=lidl/sv-SE"
  );
  const flyers = [];
  for (const cat of ov.categories || []) {
    for (const sub of cat.subcategories || []) {
      for (const f of sub.flyers || []) flyers.push(f);
    }
  }
  // Prefer national "alla butiker" current week
  const national = flyers.filter(
    (f) =>
      /alla butiker/i.test(f.name || "") ||
      /alla butiker/i.test(f.title || "") ||
      (f.flyerUrlAbsolute || "").includes("alla-butiker")
  );
  const current =
    national.find((f) => f.status === "current") ||
    national[0] ||
    flyers.find((f) => f.status === "current") ||
    flyers[0];
  if (!current) {
    console.warn("  Lidl: no flyer found");
    return [];
  }
  const flyerUrl =
    current.flyerJson ||
    `https://endpoints.leaflets.schwarz/v4/flyer?version=4&flyer_identifier=${encodeURIComponent(
      (current.flyerUrlAbsolute || "").split("/reklamblad/")[1]?.split("/")[0] ||
        ""
    )}&client=lidl&region_code=0`;
  console.log(
    `  Lidl flyer: ${current.title || current.name} (${current.offerStartDate}–${current.offerEndDate})`
  );
  console.log(`  PDF: ${current.pdfUrl || current.hiResPdfUrl || ""}`);

  let detail = null;
  try {
    detail = await fetchJson(
      flyerUrl.includes("region_code")
        ? flyerUrl
        : flyerUrl + (flyerUrl.includes("?") ? "&" : "?") + "region_code=0"
    );
  } catch (e) {
    console.warn("  Lidl flyer detail:", e.message);
  }

  const items = [];
  // products array sometimes empty (image-based flyer) – still save meta row + any products
  const products = detail?.flyer?.products || [];
  for (const p of products) {
    const name = p.name || p.title || p.productName || "";
    const price =
      p.price || p.offerPrice || p.displayPrice || p.priceRaw || "";
    if (!name) continue;
    items.push({
      name,
      brand: p.brand || "",
      offer: String(price),
      regular: p.oldPrice || p.regularPrice || "",
      unit: p.unit || p.comparePrice || "",
      url:
        p.url ||
        current.flyerUrlAbsolute ||
        "https://www.lidl.se/c/reklamblad/s10018018",
    });
  }

  // Save flyer pointer for manual / OCR follow-up
  const metaDir = path.join(IMPORTS, "lidl");
  fs.mkdirSync(metaDir, { recursive: true });
  fs.writeFileSync(
    path.join(metaDir, `${isoWeek()}-flyer.json`),
    JSON.stringify(
      {
        title: current.title,
        name: current.name,
        start: current.offerStartDate,
        end: current.offerEndDate,
        pdf: current.pdfUrl || current.hiResPdfUrl,
        web: current.flyerUrlAbsolute,
        productsInApi: products.length,
        note:
          products.length === 0
            ? "National flyer is image/PDF based – open PDF and export key items, or keep previous CSV."
            : "Products extracted from API.",
      },
      null,
      2
    )
  );

  if (!items.length) {
    // Keep last week's CSV if exists so import still works
    const dir = path.join(IMPORTS, "lidl");
    const prev = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".csv"))
      .sort()
      .at(-1);
    if (prev) {
      console.log(`  Lidl: API has no product lines; keeping previous ${prev}`);
      return null; // signal: do not overwrite
    }
  }
  return dedupe(items);
}

/* ─── ICA (bot-protected) – export helper ─── */
async function scrapeIca() {
  // Try e-handel offers page
  const candidates = [
    "https://handlaprivatkund.ica.se/stores/1003415/offers", // larger Maxi national-ish
    process.env.ICA_STORE_URL,
  ].filter(Boolean);

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
          Accept: "text/html,application/json",
        },
        redirect: "follow",
      });
      if (!res.ok) continue;
      const text = await res.text();
      const rows = [];
      const re =
        /"(?:name|title|productName)"\s*:\s*"([^"]{3,100})"[^{}]{0,500}"(?:price|offerPrice|displayPrice)"\s*:\s*"?(?:SEK\s*)?([\d]+[.,]?\d*)/gi;
      let m;
      while ((m = re.exec(text))) {
        rows.push({
          name: m[1],
          brand: "",
          offer: `${m[2].replace(".", ",")} kr`,
          regular: "",
          unit: "",
          url: "https://www.ica.se/erbjudanden/",
        });
      }
      if (rows.length >= 10) return dedupe(rows);
    } catch {}
  }

  // Write Excel template for manual fill (bot-protected fallback)
  const week = isoWeek();
  const dir = path.join(IMPORTS, "ica");
  fs.mkdirSync(dir, { recursive: true });
  const template = path.join(dir, `${week}-MANUAL-TEMPLATE.csv`);
  if (!fs.existsSync(path.join(dir, `${week}.csv`))) {
    fs.writeFileSync(
      template,
      "Namn,Varumärke/Storlek,Erbjudandepris,Ordinarie pris,Jämförpris,Produktlänk\n" +
        "Exempel Mjölk 1L Arla,Arla,12,90 kr,15,90 kr,12,90 kr/l,https://www.ica.se/\n",
      "utf8"
    );
    console.log(
      `  ICA: bot-protected. Template: ${path.relative(ROOT, template)}`
    );
    console.log(
      "  → Open https://www.ica.se/erbjudanden/ in browser, copy offers to the CSV/XLSX, rename to YYYY-Www.csv"
    );
  }
  return null;
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((r) => {
    const k = r.name.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

async function main() {
  console.log(`══════════════════════════════════════`);
  console.log(` MatPris WEEKLY SCRAPE – Hela Sverige`);
  console.log(` Week ${isoWeek()}  ·  ${new Date().toISOString().slice(0, 10)}`);
  console.log(`══════════════════════════════════════\n`);

  const runners = {
    willys: scrapeWillys,
    coop: scrapeCoop,
    lidl: scrapeLidl,
    ica: scrapeIca,
  };

  for (const sid of STORES) {
    const fn = runners[sid];
    if (!fn) {
      console.warn(`Unknown store: ${sid}`);
      continue;
    }
    console.log(`▸ ${sid.toUpperCase()}`);
    try {
      const rows = await fn();
      if (rows?.length) await writeOutputs(sid, rows);
      else if (rows === null) console.log(`  (kept previous file)`);
      else console.log(`  0 products`);
    } catch (e) {
      console.error(`  ERROR: ${e.message}`);
      process.exitCode = 1;
    }
    console.log("");
  }

  // Summary meta
  fs.writeFileSync(
    path.join(IMPORTS, `${isoWeek()}-scrape-log.json`),
    JSON.stringify(
      {
        week: isoWeek(),
        at: new Date().toISOString(),
        coverage: "Hela Sverige (nationwide)",
        stores: STORES,
      },
      null,
      2
    )
  );
  console.log("Done. Run: npm run update");
}

main();
