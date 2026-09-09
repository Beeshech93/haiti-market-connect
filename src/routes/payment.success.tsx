import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { ShopLayout } from "@/components/ShopLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n";
import { useAuth } from "@/lib/auth-context";
import { formatHTG } from "@/lib/format";
import { refreshPaymentStatus } from "@/lib/payments.functions";

export const Route = createFileRoute("/payment/success")({
  validateSearch: z.object({ order: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Paiement — Achte La" },
      { name: "description", content: "Statut de votre paiement MonCash ou NatCash sur Achte La." },
      { property: "og:title", content: "Paiement — Achte La" },
      { property: "og:description", content: "Estati peman MonCash oswa NatCash ou sou Achte La." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaymentStatusPage,
});

function PaymentStatusPage() {
  const { order: orderNumber } = Route.useSearch();
  const { t } = useI18n();
  const { user } = useAuth();
  const check = useServerFn(refreshPaymentStatus);
  const [busy, setBusy] = useState(false);

  const order = useQuery({
    queryKey: ["order-by-number", orderNumber, user?.id],
    enabled: Boolean(user && orderNumber),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, total, payment_status, order_status, payments(id, status)")
        .eq("order_number", orderNumber!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const paid = order.data?.payment_status === "PAID";
  const paymentId = (order.data?.payments ?? [])[0]?.id;

  const verify = async () => {
    if (!paymentId) return;
    setBusy(true);
    try {
      await check({ data: { payment_id: paymentId } });
      await order.refetch();
    } finally {
      setBusy(false);
    }
  };

  return (
    <ShopLayout>
      <div className="container-page max-w-lg py-16 text-center">
        {paid ? (
          <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
        ) : (
          <Clock className="mx-auto h-14 w-14 text-muted-foreground" />
        )}
        <h1 className="mt-4 text-2xl font-extrabold">
          {paid ? t("payment.success") : t("payment.pending")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {paid ? t("payment.successHelp") : t("payment.pendingHelp")}
        </p>

        {order.data ? (
          <p className="mt-4 text-sm font-semibold">
            {order.data.order_number} · {formatHTG(Number(order.data.total))}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {!paid && paymentId ? (
            <Button disabled={busy} className="rounded-full" onClick={() => void verify()}>
              {busy ? t("loading") : t("payment.check")}
            </Button>
          ) : null}
          {order.data ? (
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/orders/$orderId" params={{ orderId: order.data.id }}>
                {t("payment.viewOrder")}
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/orders">{t("orders.title")}</Link>
            </Button>
          )}
        </div>
      </div>
    </ShopLayout>
  );
}
