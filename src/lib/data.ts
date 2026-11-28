import productsData from "@/data/products.json";

export type Store = {
  id: string;
  name: string;
  nameAr: string;
  color: string;
  website: string;
};

export type PriceEntry = {
  storeId: string;
  price: number;
  unitPrice: string;
  isOffer: boolean;
  offerText: string | null;
  productUrl?: string | null;
};

export type Product = {
  id: string;
  name: string;
  nameAr: string;
  brand: string;
  category: string;
  categoryAr: string;
  unit: string;
  prices: PriceEntry[];
};

export type CartItem = {
  productId: string;
  quantity: number;
  preferredStoreId?: string;
};

export const stores: Store[] = productsData.stores as Store[];
export const products: Product[] = productsData.products as Product[];
export const lastUpdated = productsData.lastUpdated;

/** Common Arabic ↔ Swedish search aliases so typing حليب finds Mjölk */
const ALIASES: Record<string, string[]> = {
  حليب: ["mjölk", "mjolk", "milk"],
  mjölk: ["حليب"],
  زبدة: ["smör", "smor", "butter"],
  smör: ["زبدة"],
  جبن: ["ost", "cheese"],
  ost: ["جبن"],
  بيض: ["ägg", "agg", "egg"],
  ägg: ["بيض"],
  لبن: ["fil", "yoghurt", "yogurt"],
  خبز: ["bröd", "brod", "bread", "limpa", "fralla"],
  bröd: ["خبز"],
  لحم: ["kött", "kott", "meat", "nöt", "fläsk"],
  دجاج: ["kyckling", "chicken"],
  kyckling: ["دجاج"],
  نقانق: ["korv", "sausage"],
  korv: ["نقانق"],
  تفاح: ["äpple", "apple"],
  äpple: ["تفاح"],
  موز: ["banan", "banana", "bannar"],
  banan: ["موز", "banana", "bannar"],
  banana: ["موز", "banan", "bannar"],
  bannar: ["موز", "banan", "banana"],
  طماطم: ["tomat", "tomato"],
  tomat: ["طماطم"],
  خيار: ["gurka", "cucumber"],
  gurka: ["خيار"],
  بطاطس: ["potatis", "potato"],
  potatis: ["بطاطس"],
  قهوة: ["kaffe", "coffee"],
  kaffe: ["قهوة"],
  شاي: ["te", "tea"],
  عصير: ["juice", "saft"],
  ماء: ["vatten", "water"],
  أرز: ["ris", "rice"],
  ris: ["أرز"],
  معكرونة: ["pasta", "spaghetti"],
  pasta: ["معكرونة"],
  سكر: ["socker", "sugar"],
  زيت: ["olja", "oil"],
};

export function detectQueryLang(query: string): "ar" | "sv" {
  const t = query.trim();
  if (!t) return "sv";
  if (/[\u0600-\u06FF]/.test(t)) return "ar";
  return "sv";
}

export function getStore(id: string): Store | undefined {
  return stores.find((s) => s.id === id);
}

export function getProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

/** Cheapest price among ALL stores (offers + regular prices) */
export function getBestPrice(product: Product): PriceEntry {
  if (!product.prices.length) {
    return {
      storeId: "",
      price: Infinity,
      unitPrice: "",
      isOffer: false,
      offerText: null,
    };
  }
  return product.prices.reduce((best, current) =>
    current.price < best.price ? current : best
  );
}

/** All store prices sorted cheapest → most expensive */
export function getPricesSorted(product: Product): PriceEntry[] {
  return product.prices.slice().sort((a, b) => a.price - b.price);
}

export function displayName(product: Product, lang: "ar" | "sv"): string {
  if (lang === "ar") {
    if (product.nameAr && product.nameAr !== product.name) return product.nameAr;
    return product.name;
  }
  return product.name;
}

export function displayCategory(product: Product, lang: "ar" | "sv"): string {
  if (lang === "ar" && product.categoryAr) return product.categoryAr;
  return product.category;
}

export function displayStoreName(
  store: Store | undefined,
  lang: "ar" | "sv"
): string {
  if (!store) return "";
  return lang === "ar" ? store.nameAr : store.name;
}

function expandQuery(q: string): string[] {
  const base = q.trim().toLowerCase();
  const terms = new Set<string>([base]);
  for (const [k, vals] of Object.entries(ALIASES)) {
    if (base === k || base.includes(k)) {
      vals.forEach((v) => terms.add(v));
      terms.add(k);
    }
    for (const v of vals) {
      if (base === v || base.includes(v)) {
        terms.add(k);
        vals.forEach((x) => terms.add(x));
      }
    }
  }
  return [...terms];
}

/**
 * Search all products (offers + regular prices).
 * Returns ALL matches, sorted by cheapest store price first.
 */
export function searchProducts(query: string, _lang?: "sv" | "ar"): Product[] {
  if (!query || query.trim().length < 1) return [];
  const terms = expandQuery(query);
  return products
    .filter((p) => {
      if (!p.prices.length) return false;
      const hay = [p.name, p.nameAr, p.brand, p.category, p.categoryAr]
        .join(" ")
        .toLowerCase();
      return terms.some((t) => t.length > 0 && hay.includes(t));
    })
    .sort((a, b) => getBestPrice(a).price - getBestPrice(b).price);
}

export function formatPrice(price: number): string {
  if (!Number.isFinite(price)) return "—";
  return price.toFixed(2).replace(".", ",") + " kr";
}
