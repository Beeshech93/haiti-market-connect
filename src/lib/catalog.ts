import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_SELECT, type Product, type CategoryRow, type ShippingZoneRow } from "@/lib/types";

export const categoriesQuery = () =>
  queryOptions({
    queryKey: ["categories"],
    queryFn: async (): Promise<CategoryRow[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

export type ProductFilters = {
  search?: string | undefined;
  category?: string | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  inStockOnly?: boolean | undefined;
  sort?: "newest" | "priceAsc" | "priceDesc" | "popular" | undefined;
  featured?: boolean | undefined;
  promo?: boolean | undefined;
  limit?: number | undefined;
};

export const productsQuery = (filters: ProductFilters = {}) =>
  queryOptions({
    queryKey: ["products", filters],
    queryFn: async (): Promise<Product[]> => {
      let query = supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("status", "ACTIVE");

      if (filters.search) {
        const term = `%${filters.search}%`;
        query = query.or(
          `name_fr.ilike.${term},name_ht.ilike.${term},sku.ilike.${term}`,
        );
      }
      if (filters.category) {
        const { data: cat } = await supabase
          .from("categories")
          .select("id")
          .eq("slug", filters.category)
          .maybeSingle();
        query = query.eq("category_id", cat?.id ?? "00000000-0000-0000-0000-000000000000");
      }
      if (filters.featured) query = query.eq("is_featured", true);
      if (filters.promo) query = query.not("sale_price", "is", null);
      if (filters.inStockOnly) query = query.gt("stock", 0);
      if (filters.minPrice != null) query = query.gte("selling_price", filters.minPrice);
      if (filters.maxPrice != null) query = query.lte("selling_price", filters.maxPrice);

      switch (filters.sort) {
        case "priceAsc":
          query = query.order("selling_price", { ascending: true });
          break;
        case "priceDesc":
          query = query.order("selling_price", { ascending: false });
          break;
        case "popular":
          query = query.order("sold_count", { ascending: false });
          break;
        default:
          query = query.order("created_at", { ascending: false });
      }

      if (filters.limit) query = query.limit(filters.limit);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as Product[];
    },
  });

export const productBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["product", slug],
    queryFn: async (): Promise<Product | null> => {
      const { data, error } = await supabase
        .from("products")
        .select(`${PRODUCT_SELECT}, product_variants(kind, value, sort_order)`)
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as Product | null;
    },
  });

export const shippingZonesQuery = () =>
  queryOptions({
    queryKey: ["shipping_zones"],
    queryFn: async (): Promise<ShippingZoneRow[]> => {
      const { data, error } = await supabase
        .from("shipping_zones")
        .select("*")
        .eq("is_active", true)
        .order("price");
      if (error) throw error;
      return data ?? [];
    },
  });

export function productImage(product: Product | null | undefined): string | null {
  if (!product?.product_images?.length) return null;
  const sorted = [...product.product_images].sort((a, b) => a.sort_order - b.sort_order);
  return sorted[0]?.url ?? null;
}
