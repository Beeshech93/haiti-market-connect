import type { Database } from "@/integrations/supabase/types";

export type Tables = Database["public"]["Tables"];

export type CategoryRow = Tables["categories"]["Row"];
export type ProductRow = Tables["products"]["Row"];
export type ProductImageRow = Tables["product_images"]["Row"];
export type ProductVariantRow = Tables["product_variants"]["Row"];
export type OrderRow = Tables["orders"]["Row"];
export type OrderItemRow = Tables["order_items"]["Row"];
export type PaymentRow = Tables["payments"]["Row"];
export type ShippingZoneRow = Tables["shipping_zones"]["Row"];
export type ProfileRow = Tables["profiles"]["Row"];

export type Product = ProductRow & {
  product_images: Pick<ProductImageRow, "url" | "sort_order">[];
  product_variants?: Pick<ProductVariantRow, "kind" | "value" | "sort_order">[];
  categories?: Pick<CategoryRow, "slug" | "name_fr" | "name_ht"> | null;
};

export type CartOptions = { color?: string; size?: string };

export type CartLine = {
  key: string;
  product: Product;
  quantity: number;
  options: CartOptions;
};

export const PRODUCT_SELECT =
  "*, product_images(url, sort_order), categories(slug, name_fr, name_ht)";
