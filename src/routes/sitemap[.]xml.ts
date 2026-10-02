import { createFileRoute } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { SITE_URL } from "@/lib/seo";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function entry(path: string, lastmod?: string, priority = "0.7") {
  const loc = esc(`${SITE_URL}${path}`);
  const lm = lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : "";
  const alt = ["fr-HT", "ht-HT", "x-default"]
    .map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${loc}"/>`)
    .join("");
  return `<url><loc>${loc}</loc>${lm}<priority>${priority}</priority>${alt}</url>`;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const [products, categories] = await Promise.all([
          supabase.from("products").select("slug, updated_at").eq("status", "ACTIVE").limit(5000),
          supabase.from("categories").select("slug, updated_at").eq("is_active", true),
        ]);
        const now = new Date().toISOString();
        const urls = [
          entry("/", now, "1.0"),
          entry("/products", now, "0.9"),
          entry("/install", undefined, "0.4"),
          entry("/privacy", undefined, "0.2"),
          entry("/terms", undefined, "0.2"),
          ...(categories.data ?? []).map((c) =>
            entry(`/products?category=${encodeURIComponent(c.slug)}`, c.updated_at, "0.8"),
          ),
          ...(products.data ?? []).map((p) =>
            entry(`/products/${encodeURIComponent(p.slug)}`, p.updated_at, "0.8"),
          ),
        ];
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join("")}</urlset>`;
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
