import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { effectivePrice } from "@/lib/format";
import { PRODUCT_SELECT, type CartLine, type CartOptions, type Product } from "@/lib/types";

const STORAGE_KEY = "achtela.cart";

type GuestItem = { product_id: string; quantity: number; options: CartOptions };

function readGuestCart(): GuestItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as GuestItem[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeGuestCart(items: GuestItem[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function sameOptions(a: CartOptions, b: CartOptions) {
  return (a.color ?? "") === (b.color ?? "") && (a.size ?? "") === (b.size ?? "");
}

type CartValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  shippingEstimate: number;
  loading: boolean;
  addItem: (product: Product, quantity?: number, options?: CartOptions) => Promise<void>;
  setQuantity: (key: string, quantity: number) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  clear: () => Promise<void>;
};

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [guestItems, setGuestItems] = useState<GuestItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setGuestItems(readGuestCart());
    setHydrated(true);
  }, []);

  const userId = user?.id ?? null;

  // Merge the guest cart into the account cart right after sign-in.
  useEffect(() => {
    if (!userId || !hydrated) return;
    const pending = readGuestCart();
    if (pending.length === 0) return;
    void (async () => {
      for (const item of pending) {
        await supabase.from("cart_items").insert({
          user_id: userId,
          product_id: item.product_id,
          quantity: item.quantity,
          options: item.options,
        });
      }
      writeGuestCart([]);
      setGuestItems([]);
      await queryClient.invalidateQueries({ queryKey: ["cart"] });
    })();
  }, [userId, hydrated, queryClient]);

  const dbCart = useQuery({
    queryKey: ["cart", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cart_items")
        .select(`id, quantity, options, products(${PRODUCT_SELECT})`)
        .order("created_at");
      if (error) throw error;
      return (data ?? []).flatMap((row) => {
        const product = row.products as unknown as Product | null;
        if (!product) return [];
        return [
          {
            key: row.id,
            product,
            quantity: row.quantity,
            options: (row.options ?? {}) as CartOptions,
          } satisfies CartLine,
        ];
      });
    },
  });

  const guestProducts = useQuery({
    queryKey: ["cart-guest-products", guestItems.map((i) => i.product_id).sort()],
    enabled: !userId && guestItems.length > 0,
    queryFn: async () => {
      const ids = [...new Set(guestItems.map((i) => i.product_id))];
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .in("id", ids);
      if (error) throw error;
      return (data ?? []) as unknown as Product[];
    },
  });

  const lines: CartLine[] = useMemo(() => {
    if (userId) return dbCart.data ?? [];
    const products = guestProducts.data ?? [];
    return guestItems.flatMap((item, index) => {
      const product = products.find((p) => p.id === item.product_id);
      if (!product) return [];
      return [
        {
          key: `guest-${index}`,
          product,
          quantity: item.quantity,
          options: item.options,
        } satisfies CartLine,
      ];
    });
  }, [userId, dbCart.data, guestProducts.data, guestItems]);

  const addItem = useCallback(
    async (product: Product, quantity = 1, options: CartOptions = {}) => {
      if (userId) {
        const existing = (dbCart.data ?? []).find(
          (line) => line.product.id === product.id && sameOptions(line.options, options),
        );
        if (existing) {
          await supabase
            .from("cart_items")
            .update({ quantity: existing.quantity + quantity })
            .eq("id", existing.key);
        } else {
          await supabase.from("cart_items").insert({
            user_id: userId,
            product_id: product.id,
            quantity,
            options,
          });
        }
        await queryClient.invalidateQueries({ queryKey: ["cart"] });
        return;
      }
      const next = [...readGuestCart()];
      const idx = next.findIndex(
        (item) => item.product_id === product.id && sameOptions(item.options, options),
      );
      const current = idx >= 0 ? next[idx] : undefined;
      if (current) next[idx] = { ...current, quantity: current.quantity + quantity };
      else next.push({ product_id: product.id, quantity, options });
      writeGuestCart(next);
      setGuestItems(next);
    },
    [userId, dbCart.data, queryClient],
  );

  const setQuantity = useCallback(
    async (key: string, quantity: number) => {
      const safe = Math.max(1, quantity);
      if (userId) {
        await supabase.from("cart_items").update({ quantity: safe }).eq("id", key);
        await queryClient.invalidateQueries({ queryKey: ["cart"] });
        return;
      }
      const index = Number(key.replace("guest-", ""));
      const next = [...readGuestCart()];
      if (next[index]) next[index] = { ...next[index], quantity: safe };
      writeGuestCart(next);
      setGuestItems(next);
    },
    [userId, queryClient],
  );

  const removeItem = useCallback(
    async (key: string) => {
      if (userId) {
        await supabase.from("cart_items").delete().eq("id", key);
        await queryClient.invalidateQueries({ queryKey: ["cart"] });
        return;
      }
      const index = Number(key.replace("guest-", ""));
      const next = readGuestCart().filter((_, i) => i !== index);
      writeGuestCart(next);
      setGuestItems(next);
    },
    [userId, queryClient],
  );

  const clear = useCallback(async () => {
    if (userId) {
      await supabase.from("cart_items").delete().eq("user_id", userId);
      await queryClient.invalidateQueries({ queryKey: ["cart"] });
      return;
    }
    writeGuestCart([]);
    setGuestItems([]);
  }, [userId, queryClient]);

  const subtotal = lines.reduce(
    (sum, line) => sum + effectivePrice(line.product) * line.quantity,
    0,
  );
  const shippingEstimate = lines.reduce(
    (max, line) => Math.max(max, Number(line.product.shipping_cost ?? 0)),
    0,
  );

  const value = useMemo<CartValue>(
    () => ({
      lines,
      count: lines.reduce((sum, line) => sum + line.quantity, 0),
      subtotal,
      shippingEstimate,
      loading: userId ? dbCart.isLoading : guestProducts.isLoading,
      addItem,
      setQuantity,
      removeItem,
      clear,
    }),
    [
      lines,
      subtotal,
      shippingEstimate,
      userId,
      dbCart.isLoading,
      guestProducts.isLoading,
      addItem,
      setQuantity,
      removeItem,
      clear,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
