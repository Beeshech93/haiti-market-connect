import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Boxes, Receipt, TrendingUp, Users } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n";
import { formatDate, formatHTG } from "@/lib/format";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const { t } = useI18n();

  const stats = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [orders, products, customers] = await Promise.all([
        supabase
          .from("orders")
          .select("id, order_number, total, payment_status, order_status, created_at")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      const { data: paid } = await supabase
        .from("orders")
        .select("total")
        .eq("payment_status", "PAID");
      return {
        recent: orders.data ?? [],
        productCount: products.count ?? 0,
        customerCount: customers.count ?? 0,
        revenue: (paid ?? []).reduce((sum, row) => sum + Number(row.total), 0),
        orderCount: orders.data?.length ?? 0,
      };
    },
  });

  const cards = [
    { icon: TrendingUp, label: t("admin.revenue"), value: formatHTG(stats.data?.revenue ?? 0) },
    { icon: Receipt, label: t("admin.ordersCount"), value: String(stats.data?.orderCount ?? 0) },
    { icon: Boxes, label: t("admin.productsCount"), value: String(stats.data?.productCount ?? 0) },
    { icon: Users, label: t("admin.customers"), value: String(stats.data?.customerCount ?? 0) },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-border bg-card p-4 shadow-card"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <card.icon className="h-4 w-4 shrink-0" />
              <span className="truncate text-xs font-semibold uppercase">{card.label}</span>
            </div>
            <p className="mt-2 text-xl font-extrabold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="font-bold">{t("admin.orders")}</h2>
        <ul className="mt-3 divide-y divide-border text-sm">
          {stats.data?.recent.map((order) => (
            <li key={order.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-2">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{order.order_number}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(order.created_at)} · {t(`status.${order.order_status}`)}
                </span>
              </span>
              <span className="shrink-0 font-bold">{formatHTG(Number(order.total))}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
