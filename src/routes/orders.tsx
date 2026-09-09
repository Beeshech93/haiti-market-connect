import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { ShopLayout } from "@/components/ShopLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n";
import { useAuth } from "@/lib/auth-context";
import { formatDate, formatHTG } from "@/lib/format";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Mes commandes — Achte La" },
      { name: "description", content: "Suivez l'état de vos commandes Achte La en temps réel." },
      { property: "og:title", content: "Mes commandes — Achte La" },
      { property: "og:description", content: "Swiv kòmand Achte La ou yo." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const { t } = useI18n();
  const { user } = useAuth();

  const orders = useQuery({
    queryKey: ["orders", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, total, order_status, payment_status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
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

  return (
    <ShopLayout>
      <div className="container-page py-6">
        <h1 className="text-2xl font-extrabold">{t("orders.title")}</h1>

        {orders.isLoading ? (
          <p className="mt-6 text-muted-foreground">{t("loading")}</p>
        ) : (orders.data ?? []).length === 0 ? (
          <div className="mt-10 text-center">
            <p className="text-muted-foreground">{t("orders.empty")}</p>
            <Button asChild className="mt-4 rounded-full">
              <Link to="/products">{t("cart.continue")}</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {(orders.data ?? []).map((order) => (
              <li
                key={order.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-card"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{order.order_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(order.created_at)} · {t(`status.${order.order_status}`)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-extrabold">{formatHTG(Number(order.total))}</p>
                    <Link
                      to="/orders/$orderId"
                      params={{ orderId: order.id }}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      {t("orders.view")}
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ShopLayout>
  );
}
