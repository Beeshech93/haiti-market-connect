import { Link } from "@tanstack/react-router";
import { Heart, ShoppingCart, Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { localized, useI18n } from "@/i18n";
import { productImage } from "@/lib/catalog";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useFavorites } from "@/lib/favorites";
import { discountPercent, effectivePrice, formatHTG } from "@/lib/format";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProductCard({ product }: { product: Product }) {
  const { lang, t } = useI18n();
  const { user } = useAuth();
  const { addItem } = useCart();
  const { isFavorite, toggle } = useFavorites();
  const image = productImage(product);
  const price = effectivePrice(product);
  const discount = discountPercent(Number(product.selling_price), product.sale_price);
  const favorite = user ? isFavorite(product.id) : false;
  const outOfStock = product.stock <= 0;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-shadow hover:shadow-float">
      <Link
        to="/products/$slug"
        params={{ slug: product.slug }}
        className="relative block aspect-square overflow-hidden bg-surface"
      >
        {image ? (
          <img
            src={image}
            alt={localized(product, "name", lang)}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="size-full bg-surface" />
        )}
        {discount ? (
          <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-foreground">
            -{discount}%
          </span>
        ) : null}
        {product.stock <= 0 ? (
          <span className="absolute inset-x-0 bottom-0 bg-foreground/70 py-1 text-center text-[11px] font-semibold text-background">
            {t("product.outOfStock")}
          </span>
        ) : null}
      </Link>

      <button
        type="button"
        aria-label={t("favorites.title")}
        onClick={() => {
          if (!user) {
            toast.info(t("auth.mustLogin"));
            return;
          }
          toggle.mutate(product.id, {
            onSuccess: (result) =>
              toast.success(t(result === "added" ? "favorites.added" : "favorites.removed")),
          });
        }}
        className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-background/90 text-muted-foreground shadow-card transition-colors hover:text-accent"
      >
        <Heart className={cn("size-4", favorite && "fill-accent text-accent")} />
      </button>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <Link
          to="/products/$slug"
          params={{ slug: product.slug }}
          className="line-clamp-2 min-h-10 text-sm font-semibold leading-snug hover:text-primary"
        >
          {localized(product, "name", lang)}
        </Link>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Star className="size-3 fill-gold text-gold" />
          {Number(product.rating).toFixed(1)}
          <span>
            ({product.reviews_count} {t("product.reviews")})
          </span>
        </div>
        <div className="mt-auto flex flex-wrap items-baseline gap-1.5">
          <span className="text-base font-bold text-accent">{formatHTG(price)}</span>
          {discount ? (
            <span className="text-xs text-muted-foreground line-through">
              {formatHTG(product.selling_price)}
            </span>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          disabled={outOfStock}
          className="mt-2 w-full rounded-full"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (outOfStock) return;
            addItem(product, 1);
            toast.success(t("product.added"));
          }}
        >
          <ShoppingCart className="mr-1.5 size-4" />
          {outOfStock ? t("product.outOfStock") : t("product.addToCart")}
        </Button>
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
      </div>
    </div>
  );
}

export function ProductGrid({
  products,
  loading,
  skeletonCount = 8,
}: {
  products: Product[];
  loading?: boolean;
  skeletonCount?: number;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
