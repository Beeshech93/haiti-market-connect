import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { BazikService } from "@/lib/bazik.server";

const payloadSchema = z.object({
  event: z.string().max(120).optional(),
  event_id: z.string().max(200).optional(),
  id: z.string().max(200).optional(),
  payment_id: z.string().max(200).optional(),
  transaction_id: z.string().max(200).optional(),
  reference: z.string().max(200).optional(),
  status: z.string().max(60),
  amount: z.coerce.number().nonnegative(),
  currency: z.string().max(10).optional(),
});

/**
 * POST /api/public/payments/bazik/webhook
 *
 * The single source of truth for "the order is paid". Verifies the signature,
 * the reference, the amount and the status, and is safe to receive twice.
 */
export const Route = createFileRoute("/api/public/payments/bazik/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const signature =
          request.headers.get("x-bazik-signature") ??
          request.headers.get("x-signature") ??
          request.headers.get("x-webhook-signature");

        if (!BazikService.verifyWebhookSignature(raw, signature)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let body: z.infer<typeof payloadSchema>;
        try {
          body = payloadSchema.parse(JSON.parse(raw));
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const bazikPaymentId = body.payment_id ?? body.id ?? null;
        let query = supabaseAdmin.from("payments").select("*").limit(1);
        query = body.reference
          ? query.eq("reference_id", body.reference)
          : query.eq("bazik_payment_id", bazikPaymentId ?? "");
        const { data: payments } = await query;
        const payment = payments?.[0];

        if (!payment) return new Response("Payment not found", { status: 404 });

        // Idempotency: an event already recorded is acknowledged, not re-applied.
        const externalEventId =
          body.event_id ?? (bazikPaymentId ? `${bazikPaymentId}:${body.status}` : null);
        if (externalEventId) {
          const { data: seen } = await supabaseAdmin
            .from("payment_transactions")
            .select("id")
            .eq("external_event_id", externalEventId)
            .maybeSingle();
          if (seen) return Response.json({ received: true, duplicate: true });
        }

        const amountMatches = Math.round(Number(body.amount)) === Math.round(Number(payment.amount));
        const status = BazikService.mapStatus(body.status);

        await supabaseAdmin.from("payment_transactions").insert({
          payment_id: payment.id,
          event: body.event ?? "webhook",
          status,
          external_event_id: externalEventId,
          raw_payload: JSON.parse(raw) as never,
        });

        if (status === "PAID" && !amountMatches) {
          console.error("Bazik webhook amount mismatch", {
            payment: payment.id,
            expected: payment.amount,
            received: body.amount,
          });
          return new Response("Amount mismatch", { status: 409 });
        }

        if (payment.status === "PAID") {
          return Response.json({ received: true, alreadyPaid: true });
        }

        await supabaseAdmin
          .from("payments")
          .update({
            status,
            transaction_id: body.transaction_id ?? payment.transaction_id,
            bazik_payment_id: bazikPaymentId ?? payment.bazik_payment_id,
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
