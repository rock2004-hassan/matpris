#!/usr/bin/env node
// MatPris weekly importer.
// Usage: npm run update            (imports every file in data/imports/<store>/ that is newer than what was imported)
//        npm run update -- --force (re-import the latest file of every store)
// Input : data/imports/<ica|willys|lidl|matvarlden>/<YYYY-Www>.xlsx|csv
// Output: data/products.json + src/data/products.json, snapshot in data/history/<YYYY-Www>.json
import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DATA = path.join(ROOT, "data/products.json");
const SRC_DATA = path.join(ROOT, "src/data/products.json");
const IMPORTS = path.join(ROOT, "data/imports");
const HISTORY = path.join(ROOT, "data/history");
const STATE = path.join(ROOT, "data/imports/.imported.json");
const force = process.argv.includes("--force");

// ---------- helpers ----------
const num = (s) => {
  if (s == null) return null;
  if (typeof s === "number") return s;
  const m = String(s).replace(/\s/g, "").replace(/:(\d{2})/, ",$1").replace(/:-/, "").match(/\d+(?:[.,]\d+)?/);
  return m ? parseFloat(m[0].replace(",", ".")) : null;
};

/** "2 för 99 kr" -> 49.5 | "29,90 kr/st" -> 29.9 | "10 kr/st" -> 10 | "3 för 2" -> null */
export function parseOffer(text) {
  if (text == null || text === "") return null;
  if (typeof text === "number") return { price: text, offerText: null };
  const t = String(text).trim().toLowerCase();
  const multi = t.match(/(\d+)\s*(?:för|f\.)\s*(\d+(?:[.,:]\d+)?)\s*(?:kr|:-)?/);
  if (multi) {
    const n = +multi[1], total = num(multi[2]);
    if (n > 0 && total != null) return { price: Math.round((total / n) * 100) / 100, offerText: String(text).trim() };
  }
  if (!/kr|:-|\d[,:.]\d{2}/.test(t)) return null; // e.g. "Max 2 köp" is not a price
  const p = num(t.split("|")[0]);
  return p != null ? { price: p, offerText: String(text).trim() } : null;
}

const strip = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const NOISE = /\b(prisfest|stammis|veckans|erbjudande|utvalda|smaker|ica|willys|lidl|eko|krav)\b/g;
export function normName(name, brand = "") {
  const t = strip(`${name} ${brand}`.toLowerCase().replace(/å/g, "a").replace(/ä/g, "a").replace(/ö/g, "o"))
    .replace(NOISE, " ").replace(/[^a-z0-9% ,.]/g, " ").replace(/(\d),(\d)/g, "$1.$2");
  return t.split(/\s+/).filter(Boolean);
}
const sizeOf = (tokens) => tokens.find((x) => /^\d+(\.\d+)?(g|kg|ml|cl|l|dl|st|p)$/.test(x)) || "";
function similar(a, b) {
  const A = new Set(a), B = new Set(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  const j = inter / (A.size + B.size - inter || 1);
  const sa = sizeOf(a), sb = sizeOf(b);
  if (sa && sb && sa !== sb) return 0; // different pack size = different product
  return j;
}

const CATS = [
  [/mjölk|mjolk|yoghurt|ost\b|smör|smor|grädde|gradde|fil\b|kvarg|ägg|agg\b/i, "Mejeri", "ألبان وبيض"],
  [/bröd|brod|knäcke|knacke|frallor|tunnbröd/i, "Bröd", "خبز"],
  [/kyckling|korv|fläsk|flask|nöt|not\b|färs|fars|bacon|skinka|köttbull|kottbull/i, "Kött", "لحوم"],
  [/lax|torsk|räk|rak\b|sill|tonfisk|fisk/i, "Fisk", "أسماك"],
  [/banan|äpple|apple|tomat|gurka|potatis|lök|lok\b|sallad|morot|frukt|grönt|gront|apelsin/i, "Frukt & grönt", "فواكه وخضروات"],
  [/kaffe|te\b|läsk|lask|juice|vatten|öl\b|cider|dryck|saft/i, "Dryck", "مشروبات"],
  [/pasta|ris\b|mjöl|mjol|socker|havre|müsli|musli|flingor|konserv|sås|sas\b|olja|bönor|bonor|linser/i, "Skafferi", "مواد جافة"],
  [/tvätt|tvatt|diskmedel|toalett|hushållspapper|påse|pase|avfall|rengör|schampo|tandkräm|tvål|blöjor/i, "Hygien & hem", "نظافة ومنزل"],
];
const categorize = (n) => { for (const [re, c, ar] of CATS) if (re.test(n)) return [c, ar]; return ["Övrigt", "متنوع"]; };

const HEADERS = {
  name: ["namn", "name", "produkt", "product", "artikel"],
  brand: ["varumärke/storlek", "varumärke", "brand", "storlek", "size"],
  offer: ["erbjudandepris", "pris", "price", "erbjudande", "offer"],
  regular: ["ordinarie pris", "ordinarie", "regular", "regularprice"],
  unit: ["jämförpris", "jamforpris", "unitprice", "unit price", "jämförelsepris"],
};

async function readRows(file) {
  const wb = new ExcelJS.Workbook();
  if (file.endsWith(".csv")) await wb.csv.readFile(file); else await wb.xlsx.readFile(file);
  const ws = wb.worksheets[0];
  const rows = [];
  ws.eachRow((r) => rows.push(r.values.slice(1).map((v) => (v && typeof v === "object" && "result" in v ? v.result : v && v.text ? v.text : v))));
  const head = rows.shift().map((h) => String(h ?? "").trim().toLowerCase());
  const idx = {};
  for (const [k, names] of Object.entries(HEADERS)) idx[k] = head.findIndex((h) => names.includes(h));
  if (idx.name < 0 || idx.offer < 0) throw new Error(`${file}: missing required columns (Namn + Erbjudandepris). Found: ${head.join(", ")}`);
  return rows.map((r) => ({
    name: String(r[idx.name] ?? "").trim(),
    brandSize: idx.brand >= 0 ? String(r[idx.brand] ?? "").trim() : "",
    offer: r[idx.offer],
    regular: idx.regular >= 0 ? r[idx.regular] : null,
    unitPrice: idx.unit >= 0 ? String(r[idx.unit] ?? "").trim() : "",
  })).filter((r) => r.name);
}

function isoWeek(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t - new Date(Date.UTC(y, 0, 1))) / 864e5 + 1) / 7);
  return `${y}-W${String(w).padStart(2, "0")}`;
}

// ---------- main ----------
async function main() {
  const db = JSON.parse(fs.readFileSync(DATA, "utf8"));
  const storeIds = db.stores.map((s) => s.id);
  const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : {};
  const jobs = [];
  for (const sid of storeIds) {
    const dir = path.join(IMPORTS, sid);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter((f) => /\.(xlsx|csv)$/i.test(f)).sort();
    const latest = files.at(-1);
    if (latest && (force || state[sid] !== latest)) jobs.push({ sid, file: latest });
  }
  if (!jobs.length) { console.log("Nothing new to import. Drop a file in data/imports/<store>/ (e.g. 2026-W48.xlsx)."); return; }

  fs.mkdirSync(HISTORY, { recursive: true });
  const week = isoWeek();
  fs.writeFileSync(path.join(HISTORY, `${db.week ?? week}-before-${week}.json`), JSON.stringify(db));

  const index = db.products.map((p) => ({ p, tokens: normName(p.name, p.brand) }));
  let nextId = Math.max(0, ...db.products.map((p) => parseInt(String(p.id).replace(/\D/g, "").slice(-6)) || 0)) + 1;

  for (const { sid, file } of jobs) {
    const rows = await readRows(path.join(IMPORTS, sid, file));
    // Offers expire weekly: drop this store's previous offer entries, keep regular (non-offer) prices
    for (const p of db.products) p.prices = p.prices.filter((x) => x.storeId !== sid || !x.isOffer);
    let added = 0, matched = 0, skipped = 0;
    const touched = new Set(); // products already filled by this store in this run (same-name rows = variants, keep both)
    for (const r of rows) {
      const o = parseOffer(r.offer);
      if (!o || !(o.price > 0)) { skipped++; continue; }
      const [brand, unit] = r.brandSize.includes(".") ? [r.brandSize.split(".")[0].trim(), r.brandSize.split(".").slice(1).join(".").trim()] : [r.brandSize, ""];
      const tokens = normName(r.name, brand);
      let best = null, score = 0;
      for (const e of index) { if (touched.has(e.p.id)) continue; const s = similar(tokens, e.tokens); if (s > score) { score = s; best = e; } }
      const entry = { storeId: sid, price: o.price, unitPrice: r.unitPrice, isOffer: true, offerText: o.offerText ?? "Veckans erbjudande" };
      if (best && score >= 0.8) {
        best.p.prices = best.p.prices.filter((x) => x.storeId !== sid);
        best.p.prices.push(entry); touched.add(best.p.id); matched++;
      } else {
        const [cat, catAr] = categorize(r.name);
        const p = { id: `${sid}-${String(nextId++).padStart(5, "0")}`, name: r.name, nameAr: r.name, brand, category: cat, categoryAr: catAr, unit: unit || "st", prices: [entry] };
        db.products.push(p); index.push({ p, tokens }); touched.add(p.id); added++;
      }
    }
    console.log(`${sid}: ${file} -> ${rows.length} rows, ${matched} matched, ${added} new, ${skipped} skipped`);
    state[sid] = file;
  }
  db.products = db.products.filter((p) => p.prices.length > 0);
  db.lastUpdated = new Date().toISOString().slice(0, 10);
  db.week = week;
  const out = JSON.stringify(db, null, 2) + "\n";
  fs.writeFileSync(DATA, out); fs.writeFileSync(SRC_DATA, out);
  fs.writeFileSync(STATE, JSON.stringify(state, null, 2) + "\n");
  const multi = db.products.filter((p) => p.prices.length > 1).length;
  console.log(`Done: ${db.products.length} products (${multi} comparable across 2+ stores), week ${week}.`);
}
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) main().catch((e) => { console.error(e.message); process.exit(1); });
