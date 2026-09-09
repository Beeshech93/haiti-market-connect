import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";

import { ProductGrid } from "@/components/ProductCard";
import { ShopLayout } from "@/components/ShopLayout";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { useAuth } from "@/lib/auth-context";
import { useFavorites } from "@/lib/favorites";

export const Route = createFileRoute("/favorites")({
  head: () => ({
    meta: [
      { title: "Mes favoris — Achte La" },
      { name: "description", content: "Retrouvez les produits Achte La que vous avez sauvegardés." },
      { property: "og:title", content: "Mes favoris — Achte La" },
      { property: "og:description", content: "Pwodwi ou pi renmen sou Achte La." },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { favorites, loading } = useFavorites();

  return (
    <ShopLayout>
      <div className="container-page py-6">
        <h1 className="text-2xl font-extrabold">{t("favorites.title")}</h1>

        {!user ? (
          <div className="mt-8 flex flex-col items-center gap-4 rounded-3xl border border-border bg-card p-10 text-center shadow-card">
            <Heart className="size-10 text-muted-foreground" />
            <p className="text-muted-foreground">{t("auth.mustLogin")}</p>
            <Button asChild className="rounded-full">
              <Link to="/auth">{t("nav.login")}</Link>
            </Button>
          </div>
        ) : !loading && favorites.length === 0 ? (
          <div className="mt-8 flex flex-col items-center gap-4 rounded-3xl border border-border bg-card p-10 text-center shadow-card">
            <Heart className="size-10 text-muted-foreground" />
            <p className="text-muted-foreground">{t("favorites.empty")}</p>
            <Button asChild className="rounded-full">
              <Link to="/products">{t("cart.continue")}</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-5">
            <ProductGrid
              products={favorites.map((favorite) => favorite.product)}
              loading={loading}
              skeletonCount={4}
            />
          </div>
        )}
      </div>
    </ShopLayout>
  );
}
