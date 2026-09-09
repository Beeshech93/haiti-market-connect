import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const optionsSchema = z
  .object({ color: z.string().max(60).optional(), size: z.string().max(60).optional() })
  .strip();

const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: z.number().int().min(1).max(99),
        options: optionsSchema.default({}),
      }),
    )
    .min(1)
    .max(50),
  shipping_zone_id: z.string().uuid(),
  customer: z.object({
    full_name: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(6).max(30),
    email: z.string().trim().email().max(255),
    address: z.string().trim().min(3).max(255),
    city: z.string().trim().min(2).max(120),
    department: z.string().trim().max(120).optional().default(""),
    delivery_point: z.string().trim().max(160).optional().default(""),
    instructions: z.string().trim().max(500).optional().default(""),
  }),
  /** Client-side total, only used as a consistency check against the server total. */
  client_total: z.number().nonnegative(),
});

/**
 * Creates an order. All amounts are recalculated from the database — the price
 * sent by the browser is never trusted, only compared.
 */
export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createOrderSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const productIds = [...new Set(data.items.map((item) => item.product_id))];
    const { data: products, error: productsError } = await supabaseAdmin
      .from("products")
      .select("id, name_fr, name_ht, selling_price, sale_price, purchase_price, stock, status")
      .in("id", productIds);
    if (productsError) throw new Error("PRODUCTS_LOOKUP_FAILED");

    const { data: zone, error: zoneError } = await supabaseAdmin
      .from("shipping_zones")
      .select("*")
      .eq("id", data.shipping_zone_id)
      .eq("is_active", true)
      .maybeSingle();
    if (zoneError || !zone) throw new Error("SHIPPING_ZONE_INVALID");

    let subtotal = 0;
    const lines = data.items.map((item) => {
      const product = (products ?? []).find((row) => row.id === item.product_id);
      if (!product || product.status !== "ACTIVE") throw new Error("PRODUCT_UNAVAILABLE");
      const available = product.stock;
      if (available < item.quantity) throw new Error("INSUFFICIENT_STOCK");
      const selling = Number(product.selling_price);
      const sale = product.sale_price == null ? null : Number(product.sale_price);
      const unitPrice = sale && sale > 0 && sale < selling ? sale : selling;
      subtotal += unitPrice * item.quantity;
      return {
        product_id: product.id,
        product_name: product.name_fr,
        unit_price: unitPrice,
        purchase_price: Number(product.purchase_price),
        quantity: item.quantity,
        options: item.options,
      };
    });

    const shippingCost = Number(zone.price);
    const total = subtotal + shippingCost;

    if (Math.round(data.client_total) !== Math.round(total)) {
      // The displayed total no longer matches the database — refuse the order.
      throw new Error("TOTAL_MISMATCH");
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        subtotal,
        shipping_cost: shippingCost,
        total,
        currency: "HTG",
        payment_status: "PENDING",
        order_status: "PENDING_PAYMENT",
        delivery_method: zone.method,
        customer_name: data.customer.full_name,
        customer_phone: data.customer.phone,
        customer_email: data.customer.email,
        notes: data.customer.instructions,
        shipping_address: {
          ...data.customer,
          zone_id: zone.id,
          zone_name_fr: zone.name_fr,
          zone_name_ht: zone.name_ht,
          eta_days: zone.eta_days,
        },
      })
      .select("id, order_number, total, subtotal, shipping_cost")
      .single();
    if (orderError || !order) throw new Error("ORDER_CREATE_FAILED");

    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(lines.map((line) => ({ ...line, order_id: order.id })));
    if (itemsError) throw new Error("ORDER_ITEMS_FAILED");

    await supabaseAdmin.from("order_status_history").insert({
      order_id: order.id,
      status: "PENDING_PAYMENT",
      note: "Commande créée / Kòmand kreye",
      created_by: userId,
    });

    // Confirmation email — never blocks the order if sending fails.
    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      await sendTemplateEmail("order-confirmation", data.customer.email, {
        templateData: {
          customerName: data.customer.full_name,
          orderNumber: order.order_number,
          items: lines.map((line) => ({
            name: line.product_name,
            quantity: line.quantity,
            unit_price: line.unit_price,
          })),
          subtotal,
          shippingCost,
          total,
          deliveryZone: zone.name_fr,
          etaDays: zone.eta_days,
        },
        idempotencyKey: `order-confirmation-${order.id}`,
      });
    } catch (error) {
      console.error("order confirmation email failed", error);
    }


    return {
      order_id: order.id,
      order_number: order.order_number,
      subtotal: Number(order.subtotal),
      shipping_cost: Number(order.shipping_cost),
      total: Number(order.total),
    };
  });

/** Admin-only: updates the fulfilment status of an order. */
export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        order_id: z.string().uuid(),
        status: z.enum([
          "PENDING_PAYMENT",
          "PAID",
          "PROCESSING",
          "PURCHASED",
          "IN_TRANSIT",
          "ARRIVED_HAITI",
          "OUT_FOR_DELIVERY",
          "DELIVERED",
          "CANCELLED",
        ]),
        note: z.string().max(500).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", {
      _user_id: context.userId,
    });
    if (!isAdmin) throw new Error("FORBIDDEN");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: previous } = await supabaseAdmin
      .from("orders")
      .select("order_status, user_id")
      .eq("id", data.order_id)
      .maybeSingle();

    const { error } = await supabaseAdmin
      .from("orders")
      .update({ order_status: data.status })
      .eq("id", data.order_id);
    if (error) throw new Error("ORDER_UPDATE_FAILED");

    await supabaseAdmin.from("order_status_history").insert({
      order_id: data.order_id,
      status: data.status,
      note: data.note ?? null,
      created_by: context.userId,
    });

    await supabaseAdmin.from("audit_logs").insert({
      admin_id: context.userId,
      action: "ORDER_STATUS_UPDATE",
      entity: "orders",
      entity_id: data.order_id,
      old_value: previous ? { order_status: previous.order_status } : null,
      new_value: { order_status: data.status },
    });

    if (previous?.user_id) {
      await supabaseAdmin.from("notifications").insert({
        user_id: previous.user_id,
        title_fr: "Mise à jour de votre commande",
        title_ht: "Mizajou sou kòmand ou",
        body_fr: `Nouveau statut : ${data.status}`,
        body_ht: `Nouvo estati : ${data.status}`,
        order_id: data.order_id,
      });
    }

    return { ok: true };
  });
