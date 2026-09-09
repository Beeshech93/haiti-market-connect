import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n";
import { formatDate, formatHTG } from "@/lib/format";
import { updateOrderStatus } from "@/lib/orders.functions";

const STATUSES = [
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "PURCHASED",
  "IN_TRANSIT",
  "ARRIVED_HAITI",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
] as const;

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

function AdminOrders() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const update = useServerFn(updateOrderStatus);
  const [busy, setBusy] = useState<string | null>(null);

  const orders = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_number, customer_name, customer_phone, total, payment_status, order_status, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const change = async (orderId: string, status: (typeof STATUSES)[number]) => {
    setBusy(orderId);
    try {
      await update({ data: { order_id: orderId, status } });
      await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success(t("admin.saved"));
    } catch {
      toast.error(t("error.generic"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      {(orders.data ?? []).map((order) => (
        <div key={order.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <div className="min-w-0">
              <p className="truncate font-bold">{order.order_number}</p>
              <p className="truncate text-xs text-muted-foreground">
                {order.customer_name} · {order.customer_phone}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(order.created_at)} · {order.payment_status}
              </p>
            </div>
            <p className="shrink-0 font-extrabold">{formatHTG(Number(order.total))}</p>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              className="rounded-full border border-border bg-background px-3 py-1.5 text-sm"
              value={order.order_status}
              onChange={(event) =>
                void change(order.id, event.target.value as (typeof STATUSES)[number])
              }
              disabled={busy === order.id}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`status.${status}`)}
                </option>
              ))}
            </select>
            {busy === order.id ? (
              <span className="text-xs text-muted-foreground">{t("loading")}</span>
            ) : null}
          </div>
        </div>
      ))}
      {orders.data?.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("orders.empty")}</p>
      ) : null}
      <Button variant="outline" className="rounded-full" onClick={() => void orders.refetch()}>
        {t("admin.updateStatus")}
      </Button>
    </div>
  );
}
