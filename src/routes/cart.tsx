import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ShopLayout } from "@/components/ShopLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { localized, useI18n } from "@/i18n";
import { useCart } from "@/lib/cart-context";
import { productImage } from "@/lib/catalog";
import { effectivePrice, formatHTG } from "@/lib/format";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Panier — Achte La" },
      { name: "description", content: "Votre panier Achte La : vérifiez vos articles et passez commande." },
      { property: "og:title", content: "Panier — Achte La" },
      { property: "og:description", content: "Panyen ou sou Achte La. Pase kòmand ou." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { lang, t } = useI18n();
  const { lines, subtotal, shippingEstimate, loading, setQuantity, removeItem, clear } = useCart();

  return (
    <ShopLayout>
      <div className="container-page py-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold">{t("cart.title")}</h1>
          {lines.length > 0 ? (
            <Button variant="ghost" className="text-accent" onClick={() => void clear()}>
              {t("cart.clear")}
            </Button>
          ) : null}
        </div>

        {loading ? (
          <div className="mt-6 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : lines.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-4 rounded-3xl border border-border bg-card p-10 text-center shadow-card">
            <ShoppingBag className="size-10 text-muted-foreground" />
            <p className="text-muted-foreground">{t("cart.empty")}</p>
            <Button asChild className="rounded-full">
              <Link to="/products">{t("cart.continue")}</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <ul className="space-y-3">
              {lines.map((line) => {
                const image = productImage(line.product);
                const unit = effectivePrice(line.product);
                return (
                  <li
                    key={line.key}
                    className="flex gap-3 rounded-2xl border border-border bg-card p-3 shadow-card"
                  >
                    <Link
                      to="/products/$slug"
                      params={{ slug: line.product.slug }}
                      className="size-20 shrink-0 overflow-hidden rounded-xl bg-surface"
                    >
                      {image ? (
                        <img src={image} alt="" className="size-full object-cover" />
                      ) : null}
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <Link
                        to="/products/$slug"
                        params={{ slug: line.product.slug }}
                        className="line-clamp-2 text-sm font-semibold hover:text-primary"
                      >
                        {localized(line.product, "name", lang)}
                      </Link>
                      {line.options.color || line.options.size ? (
                        <span className="text-xs text-muted-foreground">
                          {[line.options.color, line.options.size].filter(Boolean).join(" · ")}
                        </span>
                      ) : null}
                      <span className="text-sm font-bold text-accent">{formatHTG(unit)}</span>
                      <div className="mt-auto flex items-center gap-2">
                        <div className="flex items-center gap-1 rounded-full border border-border p-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 rounded-full"
                            onClick={() => void setQuantity(line.key, line.quantity - 1)}
                          >
                            <Minus className="size-3.5" />
                          </Button>
                          <span className="w-7 text-center text-sm font-semibold">
                            {line.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 rounded-full"
                            onClick={() => void setQuantity(line.key, line.quantity + 1)}
                          >
                            <Plus className="size-3.5" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          aria-label={t("cart.clear")}
                          onClick={() => {
                            void removeItem(line.key);
                            toast.success(t("cart.removed"));
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <aside className="h-fit space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card lg:sticky lg:top-24">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("cart.subtotal")}</span>
                <span className="font-semibold">{formatHTG(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("cart.shipping")}</span>
                <span className="font-semibold">
                  {shippingEstimate ? formatHTG(shippingEstimate) : t("common.free")}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
                <span>{t("cart.total")}</span>
                <span className="text-accent">{formatHTG(subtotal + shippingEstimate)}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t("cart.shippingNote")}</p>
              <Button
                asChild
                size="lg"
                className="w-full rounded-full bg-accent font-semibold text-accent-foreground hover:bg-accent/90"
              >
                <Link to="/checkout">{t("cart.checkout")}</Link>
              </Button>
              <Button asChild variant="outline" className="w-full rounded-full">
                <Link to="/products">{t("cart.continue")}</Link>
              </Button>
            </aside>
          </div>
        )}
      </div>
    </ShopLayout>
  );
}
