import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTelegramUser } from "@/hooks/useTelegramUser";

export function useFavorites() {
  const { user } = useTelegramUser();
  const queryClient = useQueryClient();

  const { data: favoriteIds, isLoading } = useQuery({
    queryKey: ["favorites", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("listing_id")
        .eq("telegram_id", user.id);
      if (error) throw error;
      return new Set(data.map((f) => f.listing_id));
    },
    enabled: user.id !== 0,
  });

  const isFavorite = (listingId: string) => favoriteIds?.has(listingId) ?? false;

  const toggleFavorite = useMutation({
    mutationFn: async (listingId: string) => {
      if (isFavorite(listingId)) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("telegram_id", user.id)
          .eq("listing_id", listingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ telegram_id: user.id, listing_id: listingId });
        if (error) throw error;

        // Notify seller about the favorite
        try {
          const { data: listing } = await supabase
            .from("listings")
            .select("title, seller_telegram_id")
            .eq("id", listingId)
            .single();
          if (listing) {
            const { notifyFavorite } = await import("@/hooks/useNotifications");
            await notifyFavorite(
              listingId,
              listing.title,
              listing.seller_telegram_id,
              user.first_name,
              user.username,
              user.id
            );
          }
        } catch {
          // notification failure shouldn't block favorite
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites", user.id] });
    },
  });

  return { favoriteIds, isLoading, isFavorite, toggleFavorite };
}

export function useFavoriteListings() {
  const { user } = useTelegramUser();

  return useQuery({
    queryKey: ["favorite-listings", user.id],
    queryFn: async () => {
      const { data: favs, error: favErr } = await supabase
        .from("favorites")
        .select("listing_id")
        .eq("telegram_id", user.id)
        .order("created_at", { ascending: false });
      if (favErr) throw favErr;
      if (!favs.length) return [];

      const ids = favs.map((f) => f.listing_id);
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .in("id", ids);
      if (error) throw error;

      // Maintain favorites order
      const map = new Map(data.map((l) => [l.id, l]));
      return ids.map((id) => map.get(id)).filter(Boolean) as typeof data;
    },
    enabled: user.id !== 0,
  });
}
