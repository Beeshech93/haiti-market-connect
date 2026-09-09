import type { Lang } from "@/i18n";

/** Formats an amount in Haitian gourdes, e.g. 3 500 HTG */
export function formatHTG(amount: number | string | null | undefined): string {
  const value = Number(amount ?? 0);
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value)} HTG`;
}

export function formatUSD(amount: number | string | null | undefined): string {
  const value = Number(amount ?? 0);
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value)} USD`;
}

export function formatDate(value: string | Date, lang: Lang = "fr"): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(lang === "ht" ? "fr-HT" : "fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function discountPercent(sellingPrice: number, salePrice?: number | null): number | null {
  if (!salePrice || salePrice >= sellingPrice) return null;
  return Math.round(((sellingPrice - salePrice) / sellingPrice) * 100);
}

/** Price the customer pays for one unit. */
export function effectivePrice(product: {
  selling_price: number | string;
  sale_price?: number | string | null;
}): number {
  const selling = Number(product.selling_price);
  const sale = product.sale_price == null ? null : Number(product.sale_price);
  return sale && sale > 0 && sale < selling ? sale : selling;
}
