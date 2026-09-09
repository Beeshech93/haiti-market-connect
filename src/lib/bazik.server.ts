/**
 * BazikService — isolated integration layer for MonCash / NatCash payments.
 *
 * Every Bazik credential is read from server-side environment variables and is
 * never exposed to the browser. Endpoint paths are configurable because they
 * must match the official Bazik API documentation.
 *
 * TODO(bazik): confirm the exact paths below against the official Bazik docs.
 *   - BAZIK_PATH_CREATE_PAYMENT (default: /v1/payments)
 *   - BAZIK_PATH_GET_PAYMENT    (default: /v1/payments/{id})
 *   - BAZIK_PATH_REFUND         (default: /v1/payments/{id}/refund)
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export type BazikProvider = "MONCASH" | "NATCASH";

export type BazikConfig = {
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  webhookSecret: string;
  paths: { create: string; get: string; refund: string };
};

export type BazikPayment = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  reference: string;
  checkoutUrl: string | null;
  transactionId: string | null;
  raw: unknown;
};

export function getBazikConfig(): BazikConfig | null {
  const baseUrl = process.env["BAZIK_BASE_URL"];
  const apiKey = process.env["BAZIK_API_KEY"];
  const apiSecret = process.env["BAZIK_API_SECRET"];
  const webhookSecret = process.env["BAZIK_WEBHOOK_SECRET"] ?? "";
  if (!baseUrl || !apiKey || !apiSecret) return null;
  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    apiKey,
    apiSecret,
    webhookSecret,
    paths: {
      create: process.env["BAZIK_PATH_CREATE_PAYMENT"] ?? "/v1/payments",
      get: process.env["BAZIK_PATH_GET_PAYMENT"] ?? "/v1/payments/{id}",
      refund: process.env["BAZIK_PATH_REFUND"] ?? "/v1/payments/{id}/refund",
    },
  };
}

export const BAZIK_NOT_CONFIGURED = "BAZIK_NOT_CONFIGURED";

function headers(config: BazikConfig, idempotencyKey?: string): HeadersInit {
  const value: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${config.apiKey}`,
    "X-Api-Key": config.apiKey,
    "X-Api-Secret": config.apiSecret,
  };
  if (idempotencyKey) value["Idempotency-Key"] = idempotencyKey;
  return value;
}

function normalize(raw: Record<string, unknown>): BazikPayment {
  const data = (raw["data"] as Record<string, unknown> | undefined) ?? raw;
  return {
    id: String(data["id"] ?? data["payment_id"] ?? ""),
    status: String(data["status"] ?? "PENDING").toUpperCase(),
    amount: Number(data["amount"] ?? 0),
    currency: String(data["currency"] ?? "HTG"),
    reference: String(data["reference"] ?? data["reference_id"] ?? ""),
    checkoutUrl:
      (data["checkout_url"] as string | undefined) ??
      (data["payment_url"] as string | undefined) ??
      (data["redirect_url"] as string | undefined) ??
      null,
    transactionId:
      (data["transaction_id"] as string | undefined) ??
      (data["transactionId"] as string | undefined) ??
      null,
    raw,
  };
}

async function request(
  config: BazikConfig,
  path: string,
  init: RequestInit & { idempotencyKey?: string },
): Promise<Record<string, unknown>> {
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: headers(config, init.idempotencyKey),
  });
  const text = await response.text();
  const json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  if (!response.ok) {
    console.error("Bazik API error", response.status, json);
    throw new Error(`BAZIK_HTTP_${response.status}`);
  }
  return json;
}

export const BazikService = {
  isConfigured: () => getBazikConfig() !== null,

  async createPayment(input: {
    provider: BazikProvider;
    amount: number;
    currency?: string;
    reference: string;
    idempotencyKey: string;
    description?: string;
    customer?: { name?: string | null; phone?: string | null; email?: string | null };
    returnUrl: string;
    webhookUrl: string;
  }): Promise<BazikPayment> {
    const config = getBazikConfig();
    if (!config) throw new Error(BAZIK_NOT_CONFIGURED);
    const json = await request(config, config.paths.create, {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: JSON.stringify({
        provider: input.provider,
        method: input.provider.toLowerCase(),
        amount: input.amount,
        currency: input.currency ?? "HTG",
        reference: input.reference,
        description: input.description,
        customer: input.customer,
        return_url: input.returnUrl,
        callback_url: input.webhookUrl,
        webhook_url: input.webhookUrl,
      }),
    });
    return normalize(json);
  },

  async getPaymentStatus(paymentId: string): Promise<BazikPayment> {
    const config = getBazikConfig();
    if (!config) throw new Error(BAZIK_NOT_CONFIGURED);
    const json = await request(config, config.paths.get.replace("{id}", paymentId), {
      method: "GET",
    });
    return normalize(json);
  },

  /** Re-checks a payment against Bazik before an order is marked as paid. */
  async verifyPayment(input: {
    paymentId: string;
    expectedAmount: number;
    expectedReference: string;
  }): Promise<{ ok: boolean; payment: BazikPayment }> {
    const payment = await BazikService.getPaymentStatus(input.paymentId);
    const ok =
      ["PAID", "SUCCESS", "SUCCEEDED", "COMPLETED"].includes(payment.status) &&
      Math.round(payment.amount) === Math.round(input.expectedAmount) &&
      (!payment.reference || payment.reference === input.expectedReference);
    return { ok, payment };
  },

  async refundPayment(paymentId: string, amount?: number): Promise<BazikPayment> {
    const config = getBazikConfig();
    if (!config) throw new Error(BAZIK_NOT_CONFIGURED);
    const json = await request(config, config.paths.refund.replace("{id}", paymentId), {
      method: "POST",
      body: JSON.stringify(amount ? { amount } : {}),
    });
    return normalize(json);
  },

  /** HMAC-SHA256 signature check over the raw webhook body. */
  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
    const secret = process.env["BAZIK_WEBHOOK_SECRET"];
    if (!secret || !signatureHeader) return false;
    const provided = signatureHeader.replace(/^sha256=/i, "").trim();
    const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
    const a = Buffer.from(provided, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  },

  /** Maps a Bazik status string onto the app's payment status enum. */
  mapStatus(status: string): "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "CANCELLED" | "REFUNDED" {
    const value = status.toUpperCase();
    if (["PAID", "SUCCESS", "SUCCEEDED", "COMPLETED", "CONFIRMED"].includes(value)) return "PAID";
    if (["FAILED", "ERROR", "DECLINED", "REJECTED"].includes(value)) return "FAILED";
    if (["CANCELLED", "CANCELED", "EXPIRED"].includes(value)) return "CANCELLED";
    if (["REFUNDED", "REVERSED"].includes(value)) return "REFUNDED";
    if (["PROCESSING", "IN_PROGRESS", "AUTHORIZED"].includes(value)) return "PROCESSING";
    return "PENDING";
  },
};
