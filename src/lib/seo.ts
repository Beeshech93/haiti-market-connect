export const SITE_URL = "https://achtela.store";

/** Canonical + hreflang links for a leaf route (Haitian audience, FR & Kreyòl). */
export function seoLinks(path: string) {
  const href = `${SITE_URL}${path}`;
  return [
    { rel: "canonical", href },
    { rel: "alternate", hrefLang: "fr-HT", href },
    { rel: "alternate", hrefLang: "ht-HT", href },
    { rel: "alternate", hrefLang: "x-default", href },
  ];
}

export function absoluteUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}
