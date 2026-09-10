import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SlidersHorizontal } from "lucide-react";

import { ProductGrid } from "@/components/ProductCard";
import { ShopLayout } from "@/components/ShopLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { localized, useI18n } from "@/i18n";
import { categoriesQuery, productsQuery, type ProductFilters } from "@/lib/catalog";

type CatalogSearch = {
  q?: string | undefined;
  category?: string | undefined;
  promo?: boolean | undefined;
  sort?: ProductFilters["sort"] | undefined;
  min?: number | undefined;
  max?: number | undefined;
  stock?: boolean | undefined;
};

export const Route = createFileRoute("/products/")({
  validateSearch: (search: Record<string, unknown>): CatalogSearch => ({
    q: typeof search["q"] === "string" && search["q"] ? search["q"] : undefined,
    category: typeof search["category"] === "string" && search["category"] ? search["category"] : undefined,
    promo: search["promo"] === true || search["promo"] === "true" ? true : undefined,
    sort: (["newest", "priceAsc", "priceDesc", "popular"] as const).includes(
      search["sort"] as never,
    )
      ? (search["sort"] as ProductFilters["sort"])
      : undefined,
    min: Number.isFinite(Number(search["min"])) && search["min"] !== undefined && search["min"] !== ""
      ? Number(search["min"])
      : undefined,
    max: Number.isFinite(Number(search["max"])) && search["max"] !== undefined && search["max"] !== ""
      ? Number(search["max"])
      : undefined,
    stock: search["stock"] === true || search["stock"] === "true" ? true : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Produits — Achte La" },
      {
        name: "description",
        content:
          "Parcourez le catalogue Achte La : mode, chaussures, beauté, accessoires, maison, électronique. Livraison en Haïti.",
      },
      { property: "og:title", content: "Produits — Achte La" },
      {
        property: "og:description",
        content: "Katalòg Achte La : mòd, soulye, bote, elektwonik. Livrezon ann Ayiti.",
      },
    ],
  }),
  component: CatalogPage,
});

function CatalogPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { lang, t } = useI18n();
  const categories = useQuery(categoriesQuery());

  const products = useQuery(
    productsQuery({
      search: search.q,
      category: search.category,
      promo: search.promo,
      sort: search.sort ?? "newest",
      minPrice: search.min,
      maxPrice: search.max,
      inStockOnly: search.stock,
    }),
  );

  const update = (patch: Partial<CatalogSearch>) => {
    void navigate({ search: (prev) => ({ ...prev, ...patch }) });
  };

  return (
    <ShopLayout>
      <div className="container-page py-6">
        <h1 className="text-2xl font-extrabold">
          {search.promo ? t("home.promotions") : t("catalog.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {products.isLoading ? t("loading") : t("catalog.results", { count: products.data?.length ?? 0 })}
        </p>

        <div className="mt-5 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="space-y-5 rounded-2xl border border-border bg-card p-4 shadow-card lg:sticky lg:top-24 lg:self-start">
            <div className="flex items-center gap-2 font-semibold">
              <SlidersHorizontal className="size-4 text-primary" />
              {t("catalog.filters")}
            </div>

            <div className="space-y-1.5">
              <Label>{t("catalog.category")}</Label>
              <Select
                value={search.category ?? "all"}
                onValueChange={(value) =>
                  update({ category: value === "all" ? undefined : value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("catalog.allCategories")}</SelectItem>
                  {(categories.data ?? []).map((category) => (
                    <SelectItem key={category.id} value={category.slug}>
                      {localized(category, "name", lang)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t("catalog.sort")}</Label>
              <Select
                value={search.sort ?? "newest"}
                onValueChange={(value) => update({ sort: value as ProductFilters["sort"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t("catalog.sort.newest")}</SelectItem>
                  <SelectItem value="priceAsc">{t("catalog.sort.priceAsc")}</SelectItem>
                  <SelectItem value="priceDesc">{t("catalog.sort.priceDesc")}</SelectItem>
                  <SelectItem value="popular">{t("catalog.sort.popular")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="min">{t("catalog.minPrice")}</Label>
                <Input
                  id="min"
                  type="number"
                  inputMode="numeric"
                  value={search.min ?? ""}
                  onChange={(event) =>
                    update({ min: event.target.value ? Number(event.target.value) : undefined })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="max">{t("catalog.maxPrice")}</Label>
                <Input
                  id="max"
                  type="number"
                  inputMode="numeric"
                  value={search.max ?? ""}
                  onChange={(event) =>
                    update({ max: event.target.value ? Number(event.target.value) : undefined })
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="stock">{t("catalog.inStockOnly")}</Label>
              <Switch
                id="stock"
                checked={Boolean(search.stock)}
                onCheckedChange={(checked) => update({ stock: checked ? true : undefined })}
              />
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => void navigate({ search: {} })}
            >
              {t("catalog.reset")}
            </Button>
          </aside>

          <div>
            {!products.isLoading && (products.data?.length ?? 0) === 0 ? (
              <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                {t("search.empty")}
              </p>
            ) : (
              <ProductGrid
                products={products.data ?? []}
                loading={products.isLoading}
                skeletonCount={8}
              />
            )}
          </div>
        </div>
      </div>
    </ShopLayout>
  );
}
