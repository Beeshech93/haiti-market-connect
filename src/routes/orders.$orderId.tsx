import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { ShopLayout } from "@/components/ShopLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n";
import { useAuth } from "@/lib/auth-context";
import { formatDate, formatHTG } from "@/lib/format";

export const Route = createFileRoute("/orders/$orderId")({
  head: () => ({
    meta: [
      { title: "Détail de la commande — Achte La" },
      { name: "description", content: "Détail et suivi de votre commande Achte La." },
      { property: "og:title", content: "Détail de la commande — Achte La" },
      { property: "og:description", content: "Detay ak swivi kòmand Achte La ou." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const { t, lang } = useI18n();
  const { user } = useAuth();

  const order = useQuery({
    queryKey: ["order", orderId, user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_number, subtotal, shipping_cost, total, order_status, payment_status, delivery_method, shipping_address, created_at, order_items(id, product_name, unit_price, quantity, options), order_status_history(id, status, note, created_at), payments(id, provider, status, amount)",
        )
        .eq("id", orderId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (!user) {
    return (
      <ShopLayout>
        <div className="container-page py-16 text-center">
          <p className="text-muted-foreground">{t("auth.mustLogin")}</p>
          <Button asChild className="mt-4 rounded-full">
            <Link to="/auth">{t("nav.login")}</Link>
          </Button>
        </div>
      </ShopLayout>
    );
  }

  if (order.isLoading) {
    return (
      <ShopLayout>
        <p className="container-page py-16 text-center text-muted-foreground">{t("loading")}</p>
      </ShopLayout>
    );
  }

  if (!order.data) {
    return (
      <ShopLayout>
        <div className="container-page py-16 text-center">
          <p className="text-muted-foreground">{t("orders.notFound")}</p>
          <Button asChild className="mt-4 rounded-full">
            <Link to="/orders">{t("orders.title")}</Link>
          </Button>
        </div>
      </ShopLayout>
    );
  }

  const data = order.data;
  const address = (data.shipping_address ?? {}) as Record<string, string>;
  const history = [...(data.order_status_history ?? [])].sort((a, b) =>
    a.created_at < b.created_at ? 1 : -1,
  );

  return (
    <ShopLayout>
      <div className="container-page grid gap-6 py-6 lg:grid-cols-[1fr_340px]">
        <div>
          <h1 className="text-2xl font-extrabold">{data.order_number}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(data.created_at)} · {t(`status.${data.order_status}`)}
          </p>

          <section className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-bold">{t("orders.items")}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {(data.order_items ?? []).map((item) => {
                const options = (item.options ?? {}) as Record<string, string>;
                const details = [options["color"], options["size"]].filter(Boolean).join(" · ");
                return (
                  <li key={item.id} className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate">
                        {item.quantity} × {item.product_name}
                      </span>
                      {details ? (
                        <span className="text-xs text-muted-foreground">{details}</span>
                      ) : null}
                    </span>
                    <span className="shrink-0">
                      {formatHTG(Number(item.unit_price) * item.quantity)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-bold">{t("orders.tracking")}</h2>
            <ol className="mt-3 space-y-3">
              {history.map((entry) => (
                <li key={entry.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <span className="min-w-0">
                    <span className="block font-semibold">{t(`status.${entry.status}`)}</span>
                    <span className="block text-xs text-muted-foreground">
                      {formatDate(entry.created_at)}
                      {entry.note ? ` · ${entry.note}` : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="h-fit space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card text-sm">
            <h2 className="font-bold">{t("checkout.step1")}</h2>
            <p className="mt-2 text-muted-foreground">
              {address["full_name"]}
              <br />
              {address["phone"]}
              <br />
              {address["address"]}, {address["city"]}
              {address["department"] ? `, ${address["department"]}` : ""}
              <br />
              {lang === "ht" ? address["zone_name_ht"] : address["zone_name_fr"]}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-card text-sm">
            <h2 className="font-bold">{t("checkout.summary")}</h2>
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("cart.subtotal")}</span>
                <span>{formatHTG(Number(data.subtotal))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("cart.shipping")}</span>
                <span>{formatHTG(Number(data.shipping_cost))}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 font-extrabold">
                <span>{t("cart.total")}</span>
                <span>{formatHTG(Number(data.total))}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-muted-foreground">{t("orders.payment")}</span>
                <span>
                  {(data.payments ?? [])[0]?.provider ?? "—"} · {data.payment_status}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </ShopLayout>
  );
}
