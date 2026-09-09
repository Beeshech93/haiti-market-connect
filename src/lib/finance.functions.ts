import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ProductMargin = {
  product_name: string;
  quantity: number;
  revenue: number;
  cost: number;
  margin: number;
};

type OrderMargin = {
  order_id: string;
  order_number: string;
  created_at: string;
  total: number;
  margin: number;
};

type ProviderBreakdown = {
  provider: string;
  amount: number;
  count: number;
};

/**
 * Financial dashboard data. Margins (purchase_price) never leave this server
 * function: only users with the finance/super_admin role can call it.
 */
export const getFinancialSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: allowed, error: roleError } = await supabaseAdmin.rpc("is_finance", {
      _user_id: context.userId,
    });
    if (roleError || !allowed) throw new Error("FORBIDDEN");

    const { data: paidOrders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, total, created_at")
      .eq("payment_status", "PAID")
      .order("created_at", { ascending: false });
    if (ordersError) throw new Error("FINANCE_LOAD_FAILED");

    const orders = paidOrders ?? [];
    const orderIds = orders.map((order) => order.id);

    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);

    let items: {
      order_id: string;
      product_name: string;
      unit_price: number | string;
      purchase_price: number | string;
      quantity: number;
    }[] = [];

    if (orderIds.length > 0) {
      const { data: orderItems, error: itemsError } = await supabaseAdmin
        .from("order_items")
        .select("order_id, product_name, unit_price, purchase_price, quantity")
        .in("order_id", orderIds);
      if (itemsError) throw new Error("FINANCE_LOAD_FAILED");
      items = orderItems ?? [];
    }

    const productMap = new Map<string, ProductMargin>();
    const orderMarginMap = new Map<string, number>();
    let grossMargin = 0;

    for (const item of items) {
      const quantity = Number(item.quantity);
      const revenue = Number(item.unit_price) * quantity;
      const cost = Number(item.purchase_price) * quantity;
      const margin = revenue - cost;
      grossMargin += margin;

      orderMarginMap.set(item.order_id, (orderMarginMap.get(item.order_id) ?? 0) + margin);

      const current = productMap.get(item.product_name) ?? {
        product_name: item.product_name,
        quantity: 0,
        revenue: 0,
        cost: 0,
        margin: 0,
      };
      current.quantity += quantity;
      current.revenue += revenue;
      current.cost += cost;
      current.margin += margin;
      productMap.set(item.product_name, current);
    }

    const marginByProduct: ProductMargin[] = [...productMap.values()].sort(
      (a, b) => b.margin - a.margin,
    );

    const recentOrders: OrderMargin[] = orders.slice(0, 20).map((order) => ({
      order_id: order.id,
      order_number: order.order_number,
      created_at: order.created_at,
      total: Number(order.total),
      margin: orderMarginMap.get(order.id) ?? 0,
    }));

    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from("payments")
      .select("provider, amount")
      .eq("status", "PAID");
    if (paymentsError) throw new Error("FINANCE_LOAD_FAILED");

    const providerMap = new Map<string, ProviderBreakdown>();
    for (const payment of payments ?? []) {
      const current = providerMap.get(payment.provider) ?? {
        provider: payment.provider,
        amount: 0,
        count: 0,
      };
      current.amount += Number(payment.amount);
      current.count += 1;
      providerMap.set(payment.provider, current);
    }

    const paymentBreakdown: ProviderBreakdown[] = [...providerMap.values()].sort(
      (a, b) => b.amount - a.amount,
    );

    return {
      totalRevenue,
      grossMargin,
      paidOrderCount: orders.length,
      marginByProduct,
      recentOrders,
      paymentBreakdown,
    };
  });
