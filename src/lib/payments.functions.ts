import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BAZIK_NOT_CONFIGURED, BazikService } from "@/lib/bazik.server";

const APP_URL = "https://project--77f99939-b7be-49f7-b3b6-25711475e711.lovable.app";

function appUrl() {
  return (process.env["APP_PUBLIC_URL"] ?? APP_URL).replace(/\/$/, "");
}

/**
 * Creates a Bazik payment (MonCash or NatCash) for an order.
 * The amount always comes from the order stored in the database.
 */
export const createPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        order_id: z.string().uuid(),
        provider: z.enum(["MONCASH", "NATCASH"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, total, currency, user_id, payment_status, customer_name, customer_phone, customer_email")
      .eq("id", data.order_id)
      .maybeSingle();
    if (error || !order) throw new Error("ORDER_NOT_FOUND");
    if (order.user_id !== context.userId) throw new Error("FORBIDDEN");
    if (order.payment_status === "PAID") throw new Error("ALREADY_PAID");

    const amount = Number(order.total);
    const reference = `${order.order_number}-${data.provider}`;
    const idempotencyKey = `${order.id}:${data.provider}`;

    // Idempotent: reuse the pending payment for this order + provider.
    const { data: existing } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existing && existing.status === "PAID") {
      return { payment_id: existing.id, checkout_url: existing.checkout_url, status: existing.status };
    }

    if (!BazikService.isConfigured()) {
      throw new Error(BAZIK_NOT_CONFIGURED);
    }

    let bazik;
    try {
      bazik = await BazikService.createPayment({
        provider: data.provider,
        amount,
        currency: order.currency,
        reference,
        idempotencyKey,
        description: `Achte La ${order.order_number}`,
        customer: {
          name: order.customer_name,
          phone: order.customer_phone,
          email: order.customer_email,
        },
        returnUrl: `${appUrl()}/payment/success?order=${order.order_number}`,
        webhookUrl: `${appUrl()}/api/public/payments/bazik/webhook`,
      });
    } catch (bazikError) {
      console.error("Bazik createPayment failed", bazikError);
      throw new Error("PAYMENT_CREATE_FAILED");
    }

    const payload = {
      order_id: order.id,
      user_id: order.user_id,
      provider: data.provider,
      status: BazikService.mapStatus(bazik.status),
      amount,
      currency: order.currency,
      reference_id: reference,
      idempotency_key: idempotencyKey,
      bazik_payment_id: bazik.id || null,
      checkout_url: bazik.checkoutUrl,
    };

    const { data: payment, error: paymentError } = existing
      ? await supabaseAdmin
          .from("payments")
          .update(payload)
          .eq("id", existing.id)
          .select("*")
          .single()
      : await supabaseAdmin.from("payments").insert(payload).select("*").single();
    if (paymentError || !payment) throw new Error("PAYMENT_SAVE_FAILED");

    await supabaseAdmin.from("payment_transactions").insert({
      payment_id: payment.id,
      event: "created",
      status: payment.status,
      raw_payload: bazik.raw as never,
    });

    return {
      payment_id: payment.id,
      checkout_url: payment.checkout_url,
      status: payment.status,
    };
  });

/**
 * Re-checks a payment directly with Bazik (used by the pending payment screen).
 * The order is only marked as paid from this server-side verification.
 */
export const refreshPaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ payment_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("id", data.payment_id)
      .maybeSingle();
    if (!payment) throw new Error("PAYMENT_NOT_FOUND");
    if (payment.user_id !== context.userId) throw new Error("FORBIDDEN");
    if (payment.status === "PAID") return { status: "PAID" as const };
    if (!payment.bazik_payment_id || !BazikService.isConfigured()) {
      return { status: payment.status };
    }

    const { ok, payment: remote } = await BazikService.verifyPayment({
      paymentId: payment.bazik_payment_id,
      expectedAmount: Number(payment.amount),
      expectedReference: payment.reference_id,
    });

    const mapped = ok ? "PAID" : BazikService.mapStatus(remote.status);

    await supabaseAdmin
      .from("payments")
      .update({ status: mapped, transaction_id: remote.transactionId ?? payment.transaction_id })
      .eq("id", payment.id);

    await supabaseAdmin.from("payment_transactions").insert({
      payment_id: payment.id,
      event: "status_check",
      status: mapped,
      raw_payload: remote.raw as never,
    });

    if (mapped === "PAID") {
      await supabaseAdmin
        .from("orders")
        .update({ payment_status: "PAID", order_status: "PAID" })
        .eq("id", payment.order_id);
      await supabaseAdmin.from("order_status_history").insert({
        order_id: payment.order_id,
        status: "PAID",
        note: "Paiement confirmé / Peman konfime",
      });
    }

    return { status: mapped };
  });
