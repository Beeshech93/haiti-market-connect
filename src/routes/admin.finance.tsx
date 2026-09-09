import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Coins, CreditCard, TrendingUp } from "lucide-react";

import { useI18n } from "@/i18n";
import { useAuth } from "@/lib/auth-context";
import { getFinancialSummary } from "@/lib/finance.functions";
import { formatDate, formatHTG } from "@/lib/format";

export const Route = createFileRoute("/admin/finance")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex" }],
  }),
  component: AdminFinance,
});

function AdminFinance() {
  const { t } = useI18n();
  const { isFinance, loading } = useAuth();
  const fetchSummary = useServerFn(getFinancialSummary);

  const summary = useQuery({
    queryKey: ["admin-finance"],
    queryFn: () => fetchSummary({ data: undefined }),
    enabled: isFinance,
  });

  if (loading) {
    return <p className="py-10 text-center text-muted-foreground">{t("loading")}</p>;
  }

  if (!isFinance) {
    return <p className="py-10 text-center text-muted-foreground">{t("admin.forbidden")}</p>;
  }

  if (summary.isLoading) {
    return <p className="py-10 text-center text-muted-foreground">{t("loading")}</p>;
  }

  if (summary.isError || !summary.data) {
    return <p className="py-10 text-center text-muted-foreground">{t("error.generic")}</p>;
  }

  const data = summary.data;
  const cards = [
    { icon: TrendingUp, label: t("admin.revenue"), value: formatHTG(data.totalRevenue) },
    { icon: Coins, label: t("admin.grossMargin"), value: formatHTG(data.grossMargin) },
    { icon: CreditCard, label: t("admin.ordersCount"), value: String(data.paidOrderCount) },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-2 text-muted-foreground">
              <card.icon className="h-4 w-4 shrink-0" />
              <span className="truncate text-xs font-semibold uppercase">{card.label}</span>
            </div>
            <p className="mt-2 text-xl font-extrabold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="font-bold">{t("admin.marginByProduct")}</h2>
        {data.marginByProduct.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("admin.noFinanceData")}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">{t("admin.product")}</th>
                  <th className="py-2">{t("admin.unitsSold")}</th>
                  <th className="py-2">{t("admin.revenue")}</th>
                  <th className="py-2">{t("admin.margin")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.marginByProduct.map((row) => (
                  <tr key={row.product_name}>
                    <td className="max-w-[220px] truncate py-2 font-semibold">
                      {row.product_name}
                    </td>
                    <td className="py-2">{row.quantity}</td>
                    <td className="py-2">{formatHTG(row.revenue)}</td>
                    <td className="py-2 font-bold">{formatHTG(row.margin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="font-bold">{t("admin.marginByOrder")}</h2>
        {data.recentOrders.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("admin.noFinanceData")}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">{t("orders.number")}</th>
                  <th className="py-2">{t("orders.date")}</th>
                  <th className="py-2">{t("orders.total")}</th>
                  <th className="py-2">{t("admin.margin")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.recentOrders.map((row) => (
                  <tr key={row.order_id}>
                    <td className="py-2 font-semibold">{row.order_number}</td>
                    <td className="py-2 text-muted-foreground">{formatDate(row.created_at)}</td>
                    <td className="py-2">{formatHTG(row.total)}</td>
                    <td className="py-2 font-bold">{formatHTG(row.margin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="font-bold">{t("admin.paymentBreakdown")}</h2>
        {data.paymentBreakdown.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("admin.noFinanceData")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-border text-sm">
            {data.paymentBreakdown.map((row) => (
              <li key={row.provider} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{row.provider}</span>
                  <span className="text-xs text-muted-foreground">
                    {row.count} {t("admin.transactions")}
                  </span>
                </span>
                <span className="shrink-0 font-bold">{formatHTG(row.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
