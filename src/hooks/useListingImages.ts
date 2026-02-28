import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "listing-images";

/**
 * Returns the public URLs for images belonging to a listing.
 * Images are stored under `listings/<listing_id>/` in the listing-images bucket.
 */
export function useListingImages(listingId: string | undefined) {
  return useQuery({
    queryKey: ["listing-images", listingId],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(`listings/${listingId}`, { limit: 10, sortBy: { column: "created_at", order: "asc" } });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      return data
        .filter((f) => f.name !== ".emptyFolderPlaceholder")
        .map((f) => {
          const { data: urlData } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(`listings/${listingId}/${f.name}`);
          return urlData.publicUrl;
        });
    },
    enabled: !!listingId,
    staleTime: 60_000,
  });
}

/**
 * Returns the first image URL for a listing, or null.
 */
export function useListingThumbnail(listingId: string | undefined) {
  const { data } = useListingImages(listingId);
  return data?.[0] ?? null;
}

/**
 * Batch-fetch first image for multiple listing IDs.
 */
export function useListingsThumbnails(listingIds: string[]) {
  return useQuery({
    queryKey: ["listings-thumbnails", listingIds],
    queryFn: async () => {
      const map: Record<string, string | null> = {};
      await Promise.all(
        listingIds.map(async (id) => {
          try {
            const { data, error } = await supabase.storage
              .from(BUCKET)
              .list(`listings/${id}`, { limit: 1, sortBy: { column: "created_at", order: "asc" } });

            if (error || !data?.length) {
              map[id] = null;
              return;
            }

            const file = data.find((f) => f.name !== ".emptyFolderPlaceholder");
            if (!file) {
              map[id] = null;
              return;
            }

            const { data: urlData } = supabase.storage
              .from(BUCKET)
              .getPublicUrl(`listings/${id}/${file.name}`);
            map[id] = urlData.publicUrl;
          } catch {
            map[id] = null;
          }
        })
      );
      return map;
    },
    enabled: listingIds.length > 0,
    staleTime: 60_000,
  });
}
