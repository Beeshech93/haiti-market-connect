import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, ChevronUp } from "lucide-react";
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

function readableEntries(value: unknown): [string, string][] {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
    .map(([k, v]) => [k, typeof v === "object" ? JSON.stringify(v) : String(v)]);
}

function OrderDetails({ orderId }: { orderId: string }) {
  const { t } = useI18n();

  const details = useQuery({
    queryKey: ["admin-order-details", orderId],
    queryFn: async () => {
      const [items, payments] = await Promise.all([
        supabase
          .from("order_items")
          .select("id, product_name, image_url, unit_price, quantity, options")
          .eq("order_id", orderId)
          .order("created_at", { ascending: true }),
        supabase
          .from("payments")
          .select("id, provider, status, amount, currency, reference_id, created_at")
          .eq("order_id", orderId)
          .order("created_at", { ascending: false }),
      ]);
      if (items.error) throw items.error;
      if (payments.error) throw payments.error;
      return { items: items.data ?? [], payments: payments.data ?? [] };
    },
  });

  if (details.isLoading) {
    return <p className="mt-3 text-xs text-muted-foreground">{t("loading")}</p>;
  }

  return (
    <div className="mt-4 space-y-4 border-t border-border pt-4">
      <section>
        <h4 className="text-sm font-bold">{t("orders.items")}</h4>
        <div className="mt-2 space-y-2">
          {details.data?.items.map((item) => {
            const options = readableEntries(item.options);
            return (
              <div key={item.id} className="flex items-start gap-3 rounded-xl bg-muted/40 p-2">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.product_name}
                    className="h-14 w-14 shrink-0 rounded-lg object-cover"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.product_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} × {formatHTG(Number(item.unit_price))}
                  </p>
                  {options.length > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {options.map(([key, value]) => `${key}: ${value}`).join(" · ")}
                    </p>
                  ) : null}
                </div>
                <p className="shrink-0 text-sm font-bold">
                  {formatHTG(Number(item.unit_price) * item.quantity)}
                </p>
              </div>
            );
          })}
          {details.data?.items.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("admin.noItems")}</p>
          ) : null}
        </div>
      </section>

      <section>
        <h4 className="text-sm font-bold">{t("orders.payment")}</h4>
        <div className="mt-2 space-y-2">
          {details.data?.payments.map((payment) => (
            <div
              key={payment.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/40 p-2 text-xs"
            >
              <span className="font-semibold">{payment.provider}</span>
              <span>{payment.status}</span>
              <span>{formatHTG(Number(payment.amount))}</span>
              <span className="text-muted-foreground">{formatDate(payment.created_at)}</span>
            </div>
          ))}
          {details.data?.payments.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("admin.noPayments")}</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function AdminOrders() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const update = useServerFn(updateOrderStatus);
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const orders = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_number, customer_name, customer_phone, customer_email, subtotal, shipping_cost, discount, total, notes, delivery_method, shipping_address, payment_status, order_status, created_at",
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
      {(orders.data ?? []).map((order) => {
        const isOpen = expanded[order.id] ?? false;
        const address = readableEntries(order.shipping_address);
        return (
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
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setExpanded((prev) => ({ ...prev, [order.id]: !isOpen }))}
              >
                {isOpen ? t("admin.hideDetails") : t("admin.viewDetails")}
                {isOpen ? (
                  <ChevronUp className="ml-1 h-4 w-4" />
                ) : (
                  <ChevronDown className="ml-1 h-4 w-4" />
                )}
              </Button>
              {busy === order.id ? (
                <span className="text-xs text-muted-foreground">{t("loading")}</span>
              ) : null}
            </div>

            {isOpen ? (
              <div className="mt-4 space-y-4">
                <section className="rounded-xl bg-muted/40 p-3 text-xs">
                  <h4 className="text-sm font-bold">{t("admin.customer")}</h4>
                  <p className="mt-1">{order.customer_name}</p>
                  <p>{order.customer_phone}</p>
                  {order.customer_email ? <p>{order.customer_email}</p> : null}
                </section>

                <section className="rounded-xl bg-muted/40 p-3 text-xs">
                  <h4 className="text-sm font-bold">{t("admin.deliveryAddress")}</h4>
                  <p className="mt-1">
                    {t("admin.deliveryMethod")}: {order.delivery_method}
                  </p>
                  {address.map(([key, value]) => (
                    <p key={key}>
                      {key}: {value}
                    </p>
                  ))}
                </section>

                <section className="rounded-xl bg-muted/40 p-3 text-xs">
                  <h4 className="text-sm font-bold">{t("admin.amounts")}</h4>
                  <p className="mt-1">
                    {t("cart.subtotal")}: {formatHTG(Number(order.subtotal))}
                  </p>
                  <p>
                    {t("cart.shipping")}: {formatHTG(Number(order.shipping_cost))}
                  </p>
                  <p>
                    {t("admin.discount")}: {formatHTG(Number(order.discount))}
                  </p>
                  <p className="font-bold">
                    {t("cart.total")}: {formatHTG(Number(order.total))}
                  </p>
                </section>

                {order.notes ? (
                  <section className="rounded-xl bg-muted/40 p-3 text-xs">
                    <h4 className="text-sm font-bold">{t("admin.notes")}</h4>
                    <p className="mt-1 whitespace-pre-line">{order.notes}</p>
                  </section>
                ) : null}

                <OrderDetails orderId={order.id} />
              </div>
            ) : null}
          </div>
        );
      })}
      {orders.data?.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("orders.empty")}</p>
      ) : null}
      <Button variant="outline" className="rounded-full" onClick={() => void orders.refetch()}>
        {t("admin.updateStatus")}
      </Button>
    </div>
  );
}
