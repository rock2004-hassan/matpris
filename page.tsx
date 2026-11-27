"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  products,
  stores,
  searchProducts,
  getBestPrice,
  getPricesSorted,
  getStore,
  formatPrice,
  detectQueryLang,
  displayName,
  displayCategory,
  displayStoreName,
  type Product,
  type CartItem,
  lastUpdated,
} from "@/lib/data";
import { t, type Lang } from "@/lib/i18n";
import {
  loadCart,
  addToCart,
  updateQuantity,
  removeFromCart,
  clearCart,
} from "@/lib/cart";

export default function HomePage() {
  const [lang, setLang] = useState<Lang>("ar");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [view, setView] = useState<"search" | "cart">("search");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCart(loadCart());
    searchInputRef.current?.focus();
  }, []);

  // Language of results follows what you type (Arabic letters → Arabic, else Swedish)
  const queryLang = detectQueryLang(query);
  const displayLang = query.trim() ? queryLang : lang;

  const results = useMemo(
    () => searchProducts(query, displayLang),
    [query, displayLang]
  );

  // When user types Arabic/Swedish, switch UI language to match
  useEffect(() => {
    if (query.trim() && queryLang !== lang) {
      setLang(queryLang);
    }
  }, [queryLang]); // eslint-disable-line react-hooks/exhaustive-deps

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const p = products.find((x) => x.id === item.productId);
      if (!p) return sum;
      const priceEntry = item.preferredStoreId
        ? p.prices.find((pr) => pr.storeId === item.preferredStoreId) ||
          getBestPrice(p)
        : getBestPrice(p);
      return sum + priceEntry.price * item.quantity;
    }, 0);
  }, [cart]);

  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  function handleAdd(product: Product, storeId?: string) {
    const newCart = addToCart(product.id, 1, storeId);
    setCart(newCart);
    setQuery("");
  }

  return (
    <div dir={dir} className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {t(lang, "appName")}
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              {t(lang, "tagline")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              className="text-sm border border-slate-300 rounded-lg px-2 py-1.5 bg-white"
              aria-label={t(lang, "language")}
            >
              <option value="ar">العربية</option>
              <option value="sv">Svenska</option>
            </select>
            <button
              onClick={() => setView(view === "cart" ? "search" : "cart")}
              className="relative bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              {t(lang, "cart")}
              {cartCount > 0 && (
                <span className="absolute -top-2 -end-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
            <Link
              href="/login"
              className="text-xs text-slate-500 hover:text-slate-800 underline"
            >
              {t(lang, "admin")}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {view === "search" ? (
          <>
            {/* Search */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t(lang, "searchHint")}
              </label>
              <input
                type="search"
                ref={searchInputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                              }}
                placeholder={t(lang, "searchPlaceholder")}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-lg shadow-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Results – all matches, cheapest store first */}
            {query.length > 0 && results.length === 0 && (
              <p className="text-slate-500 text-center py-8">
                {t(lang, "noResults")}
              </p>
            )}

            {query.length > 0 && results.length > 0 && (
              <p className="text-sm text-slate-500 mb-3">
                {results.length} {t(lang, "products")} · {t(lang, "sortedCheapest")}
              </p>
            )}

            <ul className="space-y-3">
              {results.map((p) => {
                const best = getBestPrice(p);
                const sorted = getPricesSorted(p);
                const store = getStore(best.storeId);
                return (
                  <li
                    key={p.id}
                    className="product-card bg-white rounded-xl border border-slate-200 p-4 transition"
                  >
                    <div className="flex justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 truncate">
                          {displayName(p, displayLang)}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {p.brand} · {displayCategory(p, displayLang)} ·{" "}
                          {p.unit}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 items-center">
                          <span className="text-lg font-bold text-emerald-700">
                            {formatPrice(best.price)}
                          </span>
                          {best.isOffer ? (
                            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                              {t(lang, "offer")}
                              {best.offerText ? ` · ${best.offerText}` : ""}
                            </span>
                          ) : (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                              {t(lang, "regularPrice")}
                            </span>
                          )}
                          <span className="text-sm text-slate-600">
                            @ {displayStoreName(store, displayLang)}
                          </span>
                        </div>

                        {/* Always show all stores, cheapest first */}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {sorted.map((pr) => {
                            const st = getStore(pr.storeId);
                            const isBest = pr.storeId === best.storeId;
                            return (
                              <button
                                key={pr.storeId}
                                type="button"
                                onClick={() => handleAdd(p, pr.storeId)}
                                className={`text-xs rounded-lg px-2.5 py-1.5 border ${
                                  isBest
                                    ? "border-emerald-400 bg-emerald-50 text-emerald-900 font-semibold"
                                    : "border-slate-200 bg-slate-50 text-slate-700"
                                }`}
                                title={pr.offerText || pr.unitPrice || ""}
                              >
                                {displayStoreName(st, displayLang)}{" "}
                                <span className="font-bold">
                                  {formatPrice(pr.price)}
                                </span>
                                {pr.isOffer ? " ★" : ""}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <button
                        onClick={() => handleAdd(p, best.storeId)}
                        className="shrink-0 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 h-fit"
                      >
                        {t(lang, "addToCart")}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            {query.length === 0 && (
              <div className="mt-8 text-center text-slate-500 text-sm">
                <p>
                  {t(lang, "lastUpdated")}: {lastUpdated}
                </p>
                <p className="mt-2">
                  {products.length} {t(lang, "products")} · 4 {t(lang, "store")}
                </p>
              </div>
            )}
          </>
        ) : (
          /* Cart view */
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{t(lang, "cart")}</h2>
              <button
                onClick={() => setView("search")}
                className="text-blue-600 text-sm hover:underline"
              >
                {t(lang, "backToSearch")}
              </button>
            </div>

            {cart.length === 0 ? (
              <p className="text-center text-slate-500 py-12">
                {t(lang, "cartEmpty")}
              </p>
            ) : (
              <>
                <ul className="space-y-3">
                  {cart.map((item) => {
                    const p = products.find((x) => x.id === item.productId);
                    if (!p) return null;
                    const priceEntry = item.preferredStoreId
                      ? p.prices.find(
                          (pr) => pr.storeId === item.preferredStoreId
                        ) || getBestPrice(p)
                      : getBestPrice(p);
                    const store = getStore(priceEntry.storeId);
                    const lineTotal = priceEntry.price * item.quantity;
                    return (
                      <li
                        key={item.productId}
                        className="bg-white rounded-xl border border-slate-200 p-4"
                      >
                        <div className="flex justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="font-semibold">
                              {displayName(p, displayLang)}
                            </h3>
                            <p className="text-sm text-slate-500">
                              {formatPrice(priceEntry.price)} × {item.quantity} ={" "}
                              <strong>{formatPrice(lineTotal)}</strong>
                            </p>
                            <p className="text-sm mt-1">
                              <span
                                className="inline-block w-2 h-2 rounded-full me-1"
                                style={{
                                  backgroundColor: store?.color || "#666",
                                }}
                              />
                              {displayStoreName(store, displayLang)}
                              {priceEntry.isOffer && (
                                <span className="ms-2 text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                                  {priceEntry.offerText || t(lang, "offer")}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setCart(
                                    updateQuantity(
                                      item.productId,
                                      item.quantity - 1
                                    )
                                  );
                                }}
                                className="w-8 h-8 rounded-lg border border-slate-300 hover:bg-slate-50"
                              >
                                −
                              </button>
                              <span className="w-8 text-center font-medium">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => {
                                  setCart(
                                    updateQuantity(
                                      item.productId,
                                      item.quantity + 1
                                    )
                                  );
                                }}
                                className="w-8 h-8 rounded-lg border border-slate-300 hover:bg-slate-50"
                              >
                                +
                              </button>
                            </div>
                            <button
                              onClick={() =>
                                setCart(removeFromCart(item.productId))
                              }
                              className="text-xs text-red-600 hover:underline"
                            >
                              {t(lang, "remove")}
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-6 bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>{t(lang, "total")}</span>
                    <span className="text-emerald-700">
                      {formatPrice(cartTotal)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {t(lang, "bestPrice")} per vara från tillgängliga butiker
                  </p>
                </div>

                <button
                  onClick={() => setCart(clearCart())}
                  className="mt-4 w-full text-red-600 border border-red-200 rounded-xl py-2.5 text-sm hover:bg-red-50"
                >
                  {t(lang, "clearCart")}
                </button>
              </>
            )}
          </div>
        )}
      </main>

      <footer className="max-w-3xl mx-auto px-4 py-8 text-center text-sm text-slate-500 space-x-3 space-y-1">
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/privacy" className="hover:text-slate-800 underline">
            {t(lang, "privacy")}
          </Link>
          <Link href="/contact" className="hover:text-slate-800 underline">
            {t(lang, "contact")}
          </Link>
          <Link href="/login" className="hover:text-slate-800 underline">
            {t(lang, "admin")}
          </Link>
        </div>
        <p>{t(lang, "support")}</p>
        <p className="text-xs">{t(lang, "lastUpdated")}: {lastUpdated}</p>
      </footer>



    </div>
  );
}
