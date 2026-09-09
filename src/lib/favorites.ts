import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PRODUCT_SELECT, type Product } from "@/lib/types";

export function useFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const favorites = useQuery({
    queryKey: ["favorites", user?.id ?? null],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select(`id, product_id, products(${PRODUCT_SELECT})`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).flatMap((row) => {
        const product = row.products as unknown as Product | null;
        return product ? [{ id: row.id, product }] : [];
      });
    },
  });

  const toggle = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error("not-authenticated");
      const existing = (favorites.data ?? []).find((f) => f.product.id === productId);
      if (existing) {
        await supabase.from("favorites").delete().eq("id", existing.id);
        return "removed" as const;
      }
      await supabase.from("favorites").insert({ user_id: user.id, product_id: productId });
      return "added" as const;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["favorites"] }),
  });

  return {
    favorites: favorites.data ?? [],
    loading: favorites.isLoading,
    isFavorite: (productId: string) =>
      (favorites.data ?? []).some((f) => f.product.id === productId),
    toggle,
  };
}
