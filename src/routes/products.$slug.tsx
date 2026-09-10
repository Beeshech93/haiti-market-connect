import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  Star,
  Truck,
  ZoomIn,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ProductGrid } from "@/components/ProductCard";
import { ShopLayout } from "@/components/ShopLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { localized, useI18n } from "@/i18n";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { productBySlugQuery, productsQuery } from "@/lib/catalog";
import { useFavorites } from "@/lib/favorites";
import { discountPercent, effectivePrice, formatHTG } from "@/lib/format";
import type { CartOptions } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/products/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Produit ${params.slug} — Achte La` },
      {
        name: "description",
        content: "Fiche produit Achte La : prix en gourdes, livraison en Haïti, paiement MonCash ou NatCash.",
      },
      { property: "og:title", content: `Produit — Achte La` },
      {
        property: "og:description",
        content: "Pwodwi Achte La : pri an goud, livrezon ann Ayiti, peman MonCash oswa NatCash.",
      },
    ],
  }),
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { slug } = Route.useParams();
  const { lang, t } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem } = useCart();
  const { isFavorite, toggle } = useFavorites();

  const productQuery = useQuery(productBySlugQuery(slug));
  const product = productQuery.data;

  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [options, setOptions] = useState<CartOptions>({});

  const images = useMemo(
    () => [...(product?.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [product],
  );
  const colors = (product?.product_variants ?? []).filter((v) => v.kind === "color");
  const sizes = (product?.product_variants ?? []).filter((v) => v.kind === "size");

  const related = useQuery({
    ...productsQuery({ category: product?.categories?.slug, limit: 10 }),
    enabled: Boolean(product?.categories?.slug),
  });

  const prevImage = useCallback(
    () => setActiveImage((i) => (i - 1 + images.length) % images.length),
    [images.length],
  );
  const nextImage = useCallback(
    () => setActiveImage((i) => (i + 1) % images.length),
    [images.length],
  );


  if (productQuery.isLoading) {
    return (
      <ShopLayout>
        <div className="container-page grid gap-6 py-6 md:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-3xl" />
          <div className="space-y-3">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        </div>
      </ShopLayout>
    );
  }

  if (!product) {
    return (
      <ShopLayout>
        <div className="container-page py-16 text-center">
          <p className="text-muted-foreground">{t("search.empty")}</p>
          <Button asChild className="mt-4">
            <Link to="/products">{t("cart.continue")}</Link>
          </Button>
        </div>
      </ShopLayout>
    );
  }

  const prevImage = useCallback(
    () => setActiveImage((i) => (i - 1 + images.length) % images.length),
    [images.length],
  );
  const nextImage = useCallback(
    () => setActiveImage((i) => (i + 1) % images.length),
    [images.length],
  );

  const price = effectivePrice(product);
  const discount = discountPercent(Number(product.selling_price), product.sale_price);
  const inStock = product.stock > 0;

  const add = async () => {
    await addItem(product, quantity, options);
    toast.success(t("product.added"));
  };

  return (
    <ShopLayout>
      <div className="container-page py-6">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-3xl border border-border bg-surface">
              {images[activeImage] ? (
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className="group relative block w-full cursor-zoom-in"
                  aria-label={t("product.zoomImage")}
                >
                  <img
                    src={images[activeImage].url}
                    alt={localized(product, "name", lang)}
                    className="aspect-square w-full object-cover"
                  />
                  <span className="absolute bottom-3 right-3 grid size-9 place-items-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <ZoomIn className="size-4" />
                  </span>
                </button>
              ) : (
                <div className="aspect-square w-full" />
              )}
              {discount ? (
                <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground">
                  -{discount}%
                </span>
              ) : null}
            </div>
            {images.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {images.map((image, index) => (
                  <button
                    key={image.url}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    className={cn(
                      "size-16 shrink-0 overflow-hidden rounded-xl border-2",
                      index === activeImage ? "border-primary" : "border-border",
                    )}
                  >
                    <img src={image.url} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">
                {localized(product, "name", lang)}
              </h1>
              <div className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="size-4 fill-gold text-gold" />
                  {Number(product.rating).toFixed(1)}
                </span>
                <span>
                  ({product.reviews_count} {t("product.reviews")})
                </span>
                {product.categories ? (
                  <Link
                    to="/products"
                    search={{ category: product.categories.slug }}
                    className="hover:text-primary"
                  >
                    · {localized(product.categories, "name", lang)}
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-3xl font-extrabold text-accent">{formatHTG(price)}</span>
              {discount ? (
                <span className="text-base text-muted-foreground line-through">
                  {formatHTG(product.selling_price)}
                </span>
              ) : null}
            </div>

            <p
              className={cn(
                "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                inStock ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
              )}
            >
              {inStock ? `${t("product.inStock")} (${product.stock})` : t("product.outOfStock")}
            </p>

            {colors.length > 0 ? (
              <div className="space-y-1.5">
                <span className="text-sm font-semibold">{t("product.color")}</span>
                <div className="flex flex-wrap gap-2">
                  {colors.map((variant) => (
                    <button
                      key={variant.value}
                      type="button"
                      onClick={() => setOptions((prev) => ({ ...prev, color: variant.value }))}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm",
                        options.color === variant.value
                          ? "border-accent bg-accent-soft text-accent"
                          : "border-border",
                      )}
                    >
                      {variant.value}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {sizes.length > 0 ? (
              <div className="space-y-1.5">
                <span className="text-sm font-semibold">{t("product.size")}</span>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((variant) => (
                    <button
                      key={variant.value}
                      type="button"
                      onClick={() => setOptions((prev) => ({ ...prev, size: variant.value }))}
                      className={cn(
                        "min-w-11 rounded-xl border px-3 py-1.5 text-sm",
                        options.size === variant.value
                          ? "border-accent bg-accent-soft text-accent"
                          : "border-border",
                      )}
                    >
                      {variant.value}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">{t("product.quantity")}</span>
              <div className="flex items-center gap-1 rounded-full border border-border p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  <Minus className="size-4" />
                </Button>
                <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full"
                  onClick={() => setQuantity((q) => Math.min(product.stock || 99, q + 1))}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    toast.info(t("auth.mustLogin"));
                    return;
                  }
                  toggle.mutate(product.id, {
                    onSuccess: (result) =>
                      toast.success(
                        t(result === "added" ? "favorites.added" : "favorites.removed"),
                      ),
                  });
                }}
                className="ml-auto grid size-10 place-items-center rounded-full border border-border text-muted-foreground hover:text-accent"
                aria-label={t("favorites.title")}
              >
                <Heart
                  className={cn(
                    "size-5",
                    user && isFavorite(product.id) && "fill-accent text-accent",
                  )}
                />
              </button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                size="lg"
                className="flex-1 rounded-full bg-accent font-semibold text-accent-foreground hover:bg-accent/90"
                disabled={!inStock}
                onClick={() => void add()}
              >
                {t("product.addToCart")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex-1 rounded-full font-semibold"
                disabled={!inStock}
                onClick={() => void add().then(() => navigate({ to: "/cart" }))}
              >
                {t("product.buyNow")}
              </Button>
            </div>

            <ul className="grid gap-2 rounded-2xl border border-border bg-card p-4 text-sm">
              <li className="flex items-center gap-2">
                <Truck className="size-4 text-primary" />
                {t("trust.delivery")}
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                {t("trust.securePayment")}
              </li>
              <li className="flex items-center gap-2">
                <Package className="size-4 text-primary" />
                {t("trust.tracked")}
              </li>
            </ul>

            <div className="space-y-1.5">
              <h2 className="text-sm font-semibold">{t("product.description")}</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {localized(product, "description", lang)}
              </p>
            </div>
          </div>
        </div>

        {(related.data ?? []).filter((item) => item.id !== product.id).length > 0 ? (
          <section className="mt-12">
            <h2 className="mb-3 text-lg font-bold">{t("product.related")}</h2>
            <ProductGrid
              products={(related.data ?? []).filter((item) => item.id !== product.id).slice(0, 5)}
              skeletonCount={5}
            />
          </section>
        ) : null}
      </div>

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent
          className="max-w-none border-none bg-black/95 p-0 text-white sm:max-w-3xl [&>button]:text-white"
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null || images.length < 2) return;
            const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
            touchStartX.current = null;
            if (Math.abs(dx) > 40) {
              if (dx < 0) nextImage();
              else prevImage();
            }
          }}
        >
          <DialogTitle className="sr-only">{localized(product, "name", lang)}</DialogTitle>
          <div className="relative flex items-center justify-center">
            {images[activeImage] ? (
              <img
                src={images[activeImage].url}
                alt={localized(product, "name", lang)}
                className="max-h-[85vh] w-full object-contain"
              />
            ) : null}
            {images.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={prevImage}
                  aria-label={t("product.prevImage")}
                  className="absolute left-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={nextImage}
                  aria-label={t("product.nextImage")}
                  className="absolute right-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"
                >
                  <ChevronRight className="size-5" />
                </button>
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
                  {activeImage + 1} / {images.length}
                </span>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </ShopLayout>
  );
}

