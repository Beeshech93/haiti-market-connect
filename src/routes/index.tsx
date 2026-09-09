import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Baby,
  Footprints,
  Home as HomeIcon,
  Package,
  ShieldCheck,
  Shirt,
  Smartphone,
  Sparkles,
  Tag,
  Truck,
  Watch,
  type LucideIcon,
} from "lucide-react";

import { ProductGrid } from "@/components/ProductCard";
import { ShopLayout } from "@/components/ShopLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { localized, useI18n } from "@/i18n";
import { categoriesQuery, productsQuery } from "@/lib/catalog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Achte La — Boutique en ligne livrée en Haïti" },
      {
        name: "description",
        content:
          "Découvrez les meilleurs produits livrés directement en Haïti. Mode, chaussures, beauté, électronique. Paiement MonCash et NatCash.",
      },
      { property: "og:title", content: "Achte La — Boutique en ligne livrée en Haïti" },
      {
        property: "og:description",
        content:
          "Tout sa ou bezwen nan yon sèl app. Livrezon ann Ayiti, peman MonCash ak NatCash.",
      },
    ],
  }),
  component: HomePage,
});

const categoryIcons: Record<string, LucideIcon> = {
  mode: Shirt,
  chaussures: Footprints,
  beaute: Sparkles,
  accessoires: Watch,
  maison: HomeIcon,
  electronique: Smartphone,
  enfants: Baby,
  promotions: Tag,
};

function HomePage() {
  const { lang, t } = useI18n();
  const categories = useQuery(categoriesQuery());
  const popular = useQuery(productsQuery({ featured: true, limit: 10 }));
  const newest = useQuery(productsQuery({ sort: "newest", limit: 10 }));
  const promos = useQuery(productsQuery({ promo: true, limit: 10 }));

  return (
    <ShopLayout>
      <section className="container-page pt-4">
        <div className="relative overflow-hidden rounded-3xl bg-brand-hero px-6 py-10 text-primary-foreground shadow-float sm:px-10 sm:py-14">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-background/15 px-3 py-1 text-xs font-semibold">
            <ShieldCheck className="size-3.5" />
            {t("home.hero.badge")}
          </span>
          <h1 className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight sm:text-5xl">
            {t("home.hero.title")}
          </h1>
          <p className="mt-2 max-w-xl text-base opacity-90 sm:text-lg">{t("home.hero.subtitle")}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="secondary" className="rounded-full font-semibold">
              <Link to="/products">{t("home.hero.cta")}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              className="rounded-full bg-accent font-semibold text-accent-foreground hover:bg-accent/90"
            >
              <Link to="/products" search={{ promo: true }}>
                {t("home.promotions")}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container-page mt-4 grid grid-cols-3 gap-3 text-center text-xs font-medium">
        {[
          { icon: Truck, label: t("trust.delivery") },
          { icon: ShieldCheck, label: t("trust.securePayment") },
          { icon: Package, label: t("trust.tracked") },
        ].map((item) => (
          <div
            key={item.label}
            className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-3 shadow-card"
          >
            <item.icon className="size-5 text-primary" />
            {item.label}
          </div>
        ))}
      </section>

      <section className="container-page mt-8">
        <h2 className="text-lg font-bold">{t("home.categories")}</h2>
        <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-8">
          {categories.isLoading
            ? Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-20 rounded-2xl" />
              ))
            : categories.data?.map((category) => {
                const Icon = categoryIcons[category.slug] ?? Tag;
                return (
                  <Link
                    key={category.id}
                    to="/products"
                    search={{ category: category.slug }}
                    className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-3 text-center shadow-card transition-colors hover:border-primary"
                  >
                    <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary">
                      <Icon className="size-4" />
                    </span>
                    <span className="text-[11px] font-semibold leading-tight">
                      {localized(category, "name", lang)}
                    </span>
                  </Link>
                );
              })}
        </div>
      </section>

      <ProductSection
        title={t("home.popular")}
        products={popular.data ?? []}
        loading={popular.isLoading}
      />
      <ProductSection
        title={t("home.promotions")}
        products={promos.data ?? []}
        loading={promos.isLoading}
        search={{ promo: true }}
      />
      <ProductSection
        title={t("home.new")}
        products={newest.data ?? []}
        loading={newest.isLoading}
      />
    </ShopLayout>
  );
}

function ProductSection({
  title,
  products,
  loading,
  search,
}: {
  title: string;
  products: Parameters<typeof ProductGrid>[0]["products"];
  loading: boolean;
  search?: { promo?: boolean; category?: string };
}) {
  const { t } = useI18n();
  if (!loading && products.length === 0) return null;

  return (
    <section className="container-page mt-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        <Link
          to="/products"
          search={search ?? {}}
          className="text-sm font-semibold text-accent hover:underline"
        >
          {t("home.seeAll")}
        </Link>
      </div>
      <ProductGrid products={products} loading={loading} skeletonCount={5} />
    </section>
  );
}
