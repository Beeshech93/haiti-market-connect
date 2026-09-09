import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { BazikService } from "@/lib/bazik.server";

const payloadSchema = z.object({
  type: z.string().max(120).optional(),
  event: z.string().max(120).optional(),
  event_id: z.string().max(200).optional(),
  orderId: z.string().max(200).optional(),
  order_id: z.string().max(200).optional(),
  referenceId: z.string().max(200).optional(),
  reference_id: z.string().max(200).optional(),
  reference: z.string().max(200).optional(),
  transactionId: z.string().max(200).optional(),
  transaction_id: z.string().max(200).optional(),
  status: z.string().max(60).optional(),
  amount: z.coerce.number().nonnegative().optional(),
  gourdes: z.coerce.number().nonnegative().optional(),
  currency: z.string().max(10).optional(),
});

/**
 * POST /api/public/payments/bazik/webhook
 *
 * The single source of truth for "the order is paid". The notification is only
 * a trigger: the status and the amount are always re-read from the Bazik API
 * (GET /order/{orderId}) before an order is marked as paid. Safe to receive twice.
 */
export const Route = createFileRoute("/api/public/payments/bazik/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();

        // When a shared secret is configured, the signature must match.
        if (BazikService.webhookSignatureConfigured()) {
          const signature =
            request.headers.get("x-bazik-signature") ??
            request.headers.get("x-signature") ??
            request.headers.get("x-webhook-signature");
          if (!BazikService.verifyWebhookSignature(raw, signature)) {
            return new Response("Invalid signature", { status: 401 });
          }
        }

        let body: z.infer<typeof payloadSchema>;
        try {
          body = payloadSchema.parse(JSON.parse(raw));
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const orderId = body.orderId ?? body.order_id ?? null;
        const reference = body.referenceId ?? body.reference_id ?? body.reference ?? null;
        if (!orderId && !reference) return new Response("Missing identifier", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: payments } = orderId
          ? await supabaseAdmin.from("payments").select("*").eq("bazik_payment_id", orderId).limit(1)
          : await supabaseAdmin.from("payments").select("*").eq("reference_id", reference ?? "").limit(1);
        const payment = payments?.[0];
        if (!payment) return new Response("Payment not found", { status: 404 });

        // Idempotency: an event already recorded is acknowledged, not re-applied.
        const eventName = body.type ?? body.event ?? "webhook";
        const externalEventId =
          body.event_id ?? `${orderId ?? reference}:${eventName}:${body.status ?? "unknown"}`;
        const { data: seen } = await supabaseAdmin
          .from("payment_transactions")
          .select("id")
          .eq("external_event_id", externalEventId)
          .maybeSingle();
        if (seen) return Response.json({ received: true, duplicate: true });

        const bazikOrderId = orderId ?? payment.bazik_payment_id;
        let status = BazikService.mapStatus(body.status ?? "pending");
        let remoteRaw: unknown = JSON.parse(raw);
        let transactionId = body.transactionId ?? body.transaction_id ?? payment.transaction_id;

        // Authoritative re-check against the Bazik API.
        if (bazikOrderId && BazikService.isConfigured()) {
          try {
            const { ok, payment: remote } = await BazikService.verifyPayment({
              paymentId: bazikOrderId,
              expectedAmount: Number(payment.amount),
              expectedReference: payment.reference_id,
            });
            remoteRaw = remote.raw;
            transactionId = remote.transactionId ?? transactionId;
            const remoteStatus = BazikService.mapStatus(remote.status);
            if (remoteStatus === "PAID" && !ok) {
              console.error("Bazik webhook verification mismatch", {
                payment: payment.id,
                expected: payment.amount,
                received: remote.amount,
                reference: remote.reference,
              });
              await supabaseAdmin.from("payment_transactions").insert({
                payment_id: payment.id,
                event: `${eventName}:mismatch`,
                status: payment.status,
                external_event_id: externalEventId,
                raw_payload: remote.raw as never,
              });
              return new Response("Verification mismatch", { status: 409 });
            }
            status = remoteStatus;
          } catch (verifyError) {
            console.error("Bazik webhook verification failed", verifyError);
            return new Response("Verification failed", { status: 502 });
          }
        } else if (status === "PAID") {
          // Never trust an unverifiable "paid" notification.
          return new Response("Verification unavailable", { status: 503 });
        }

        await supabaseAdmin.from("payment_transactions").insert({
          payment_id: payment.id,
          event: eventName,
          status,
          external_event_id: externalEventId,
          raw_payload: remoteRaw as never,
        });

        if (payment.status === "PAID") {
          return Response.json({ received: true, alreadyPaid: true });
        }

        await supabaseAdmin
          .from("payments")
          .update({
            status,
            transaction_id: transactionId,
            bazik_payment_id: bazikOrderId ?? payment.bazik_payment_id,
          })
          .eq("id", payment.id);

        if (status === "PAID") {
          await supabaseAdmin
            .from("orders")
            .update({ payment_status: "PAID", order_status: "PAID" })
            .eq("id", payment.order_id);

          await supabaseAdmin.from("order_status_history").insert({
            order_id: payment.order_id,
            status: "PAID",
            note: "Paiement confirmé par Bazik / Peman konfime pa Bazik",
          });

          await supabaseAdmin.from("notifications").insert({
            user_id: payment.user_id,
            title_fr: "Paiement confirmé",
            title_ht: "Peman konfime",
            body_fr: "Votre commande a été payée avec succès. Merci !",
            body_ht: "Kòmand ou peye avèk siksè. Mèsi !",
            order_id: payment.order_id,
          });

          // Empty the customer cart once the order is paid.
          await supabaseAdmin.from("cart_items").delete().eq("user_id", payment.user_id);
        } else if (status === "FAILED" || status === "CANCELLED") {
          await supabaseAdmin
            .from("orders")
            .update({ payment_status: status })
            .eq("id", payment.order_id);
        }

        return Response.json({ received: true });
      },
    },
  },
});
