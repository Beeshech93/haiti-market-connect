/**
 * BazikService — isolated integration layer for MonCash payments via Bazik.
 *
 * Real Bazik API (https://api.bazik.io), per the official SDK / docs:
 *   POST /token                      -> { token, expires_at }        (auth)
 *   POST /moncash/token              -> { orderId, redirectUrl, status, gourdes, referenceId }
 *   GET  /order/{orderId}            -> { orderId, referenceId, status, amount, currency }
 *   POST /moncash/withdraw           -> payout to a wallet
 *   POST /moncash/transfers          -> MonCash transfer
 *   POST /natcash/transfers          -> NatCash transfer (payout only, not collection)
 *   GET  /balance, GET /wallet       -> balances
 *
 * Bazik collects payments through MonCash only. NatCash is supported for
 * outgoing transfers, not for collecting a customer payment.
 *
 * Credentials are read from server-side environment variables and are never
 * exposed to the browser.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export type BazikProvider = "MONCASH" | "NATCASH";

export type BazikConfig = {
  baseUrl: string;
  userId: string;
  secretKey: string;
  webhookSecret: string;
};

export type BazikPayment = {
  /** Bazik orderId — used for verification and webhook matching. */
  id: string;
  status: string;
  amount: number;
  currency: string;
  reference: string;
  checkoutUrl: string | null;
  transactionId: string | null;
  raw: unknown;
};

export const BAZIK_NOT_CONFIGURED = "BAZIK_NOT_CONFIGURED";
export const BAZIK_PROVIDER_UNSUPPORTED = "BAZIK_PROVIDER_UNSUPPORTED";

/** Bazik caps a single MonCash payment at 75 000 HTG. */
export const BAZIK_MAX_MONCASH_AMOUNT = 75_000;

export function getBazikConfig(): BazikConfig | null {
  const baseUrl = process.env["BAZIK_BASE_URL"] ?? "https://api.bazik.io";
  const userId = process.env["BAZIK_USER_ID"] ?? process.env["BAZIK_API_KEY"];
  const secretKey = process.env["BAZIK_SECRET_KEY"] ?? process.env["BAZIK_API_SECRET"];
  const webhookSecret = process.env["BAZIK_WEBHOOK_SECRET"] ?? "";
  if (!userId || !secretKey) return null;
  return { baseUrl: baseUrl.replace(/\/$/, ""), userId, secretKey, webhookSecret };
}

type TokenCache = { token: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

/** Bazik access tokens are cached and refreshed one hour before expiry. */
async function getAccessToken(config: BazikConfig): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt - 60 * 60 * 1000 > now) return tokenCache.token;

  const response = await fetch(`${config.baseUrl}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ userID: config.userId, secretKey: config.secretKey }),
  });
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const token = json["token"];
  if (!response.ok || typeof token !== "string") {
    console.error("Bazik authentication failed", response.status, json["error"] ?? json["message"]);
    throw new Error("BAZIK_AUTH_FAILED");
  }
  const expiresAt = Number(json["expires_at"] ?? 0) || now + 12 * 60 * 60 * 1000;
  tokenCache = { token, expiresAt };
  return token;
}

async function request(
  config: BazikConfig,
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  retryOn401 = true,
): Promise<Record<string, unknown>> {
  const token = await getAccessToken(config);
  const response = await fetch(`${config.baseUrl}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  const json = text ? (JSON.parse(text) as Record<string, unknown>) : {};

  if (response.status === 401 && retryOn401) {
    tokenCache = null;
    return request(config, method, path, body, false);
  }
  if (!response.ok) {
    console.error("Bazik API error", method, path, response.status, json["error"] ?? json["message"]);
    throw new Error(`BAZIK_HTTP_${response.status}`);
  }
  return json;
}

function normalize(raw: Record<string, unknown>): BazikPayment {
  const data = (raw["data"] as Record<string, unknown> | undefined) ?? raw;
  return {
    id: String(data["orderId"] ?? data["order_id"] ?? data["transactionId"] ?? data["transaction_id"] ?? ""),
    status: String(data["status"] ?? "pending").toUpperCase(),
    amount: Number(data["amount"] ?? data["gourdes"] ?? data["gdes"] ?? 0),
    currency: String(data["currency"] ?? "HTG"),
    reference: String(data["referenceId"] ?? data["reference_id"] ?? ""),
    checkoutUrl:
      (data["redirectUrl"] as string | undefined) ?? (data["redirect_url"] as string | undefined) ?? null,
    transactionId:
      (data["transactionId"] as string | undefined) ?? (data["transaction_id"] as string | undefined) ?? null,
    raw,
  };
}

function splitName(name: string | null | undefined): { first: string; last: string } {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "Client", last: "Achte La" };
  if (parts.length === 1) return { first: parts[0] as string, last: "-" };
  return { first: parts[0] as string, last: parts.slice(1).join(" ") };
}

export const BazikService = {
  isConfigured: () => getBazikConfig() !== null,

  /** Creates a MonCash payment; the customer must be sent to `checkoutUrl`. */
  async createPayment(input: {
    provider: BazikProvider;
    amount: number;
    currency?: string;
    reference: string;
    idempotencyKey: string;
    description?: string;
    customer?: { name?: string | null; phone?: string | null; email?: string | null };
    returnUrl: string;
    errorUrl?: string;
    webhookUrl: string;
  }): Promise<BazikPayment> {
    const config = getBazikConfig();
    if (!config) throw new Error(BAZIK_NOT_CONFIGURED);
    // Bazik collects customer payments through MonCash only.
    if (input.provider !== "MONCASH") throw new Error(BAZIK_PROVIDER_UNSUPPORTED);
    if (input.amount > BAZIK_MAX_MONCASH_AMOUNT) throw new Error("BAZIK_AMOUNT_TOO_LARGE");

    const { first, last } = splitName(input.customer?.name);
    const json = await request(config, "POST", "/moncash/token", {
      gdes: Number(input.amount.toFixed(2)),
      successUrl: input.returnUrl,
      errorUrl: input.errorUrl ?? input.returnUrl,
      description: input.description,
      referenceId: input.reference,
      customerFirstName: first,
      customerLastName: last,
      customerEmail: input.customer?.email ?? undefined,
      webhookUrl: input.webhookUrl,
      metadata: {
        idempotency_key: input.idempotencyKey,
        reference: input.reference,
        phone: input.customer?.phone ?? undefined,
      },
    });
    return normalize(json);
  },

  /** Fetches a payment by Bazik orderId. */
  async getPaymentStatus(orderId: string): Promise<BazikPayment> {
    const config = getBazikConfig();
    if (!config) throw new Error(BAZIK_NOT_CONFIGURED);
    const json = await request(config, "GET", `/order/${encodeURIComponent(orderId)}`);
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
      BazikService.mapStatus(payment.status) === "PAID" &&
      Math.round(payment.amount) === Math.round(input.expectedAmount) &&
      (!payment.reference || payment.reference === input.expectedReference);
    return { ok, payment };
  },

  /** MonCash payout to a customer wallet (8 or 11 digits). */
  async withdraw(input: {
    amount: number;
    wallet: string;
    firstName: string;
    lastName: string;
    description?: string;
    reference?: string;
    webhookUrl?: string;
  }): Promise<BazikPayment> {
    const config = getBazikConfig();
    if (!config) throw new Error(BAZIK_NOT_CONFIGURED);
    const json = await request(config, "POST", "/moncash/withdraw", {
      gdes: Number(input.amount.toFixed(2)),
      wallet: input.wallet,
      customerFirstName: input.firstName,
      customerLastName: input.lastName,
      description: input.description,
      referenceId: input.reference,
      webhookUrl: input.webhookUrl,
    });
    return normalize(json);
  },

  /** Account balance (available + reserved). */
  async getBalance(): Promise<Record<string, unknown>> {
    const config = getBazikConfig();
    if (!config) throw new Error(BAZIK_NOT_CONFIGURED);
    return request(config, "GET", "/balance");
  },

  /**
   * Optional HMAC-SHA256 check over the raw webhook body. Bazik does not
   * document a signature header, so a missing secret means the webhook is
   * authenticated by re-verifying the order against the Bazik API instead.
   */
  webhookSignatureConfigured: () => Boolean(process.env["BAZIK_WEBHOOK_SECRET"]),

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

  /** Maps a Bazik status onto the app's payment status enum. */
  mapStatus(status: string): "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "CANCELLED" | "REFUNDED" {
    const value = status.toUpperCase();
    if (["SUCCESSFUL", "SUCCESS", "COMPLETED", "PAID", "CONFIRMED"].includes(value)) return "PAID";
    if (["FAILED", "ERROR", "DECLINED", "REJECTED"].includes(value)) return "FAILED";
    if (["CANCELLED", "CANCELED", "EXPIRED"].includes(value)) return "CANCELLED";
    if (["REFUNDED", "REVERSED"].includes(value)) return "REFUNDED";
    if (["PROCESSING", "IN_PROGRESS", "AUTHORIZED"].includes(value)) return "PROCESSING";
    return "PENDING";
  },
};
