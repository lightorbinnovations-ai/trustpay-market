import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch all active, non-expired ads and return a shuffled subset.
 * Weighted by stars_paid — higher spenders get more exposure.
 * Each page passes a unique `pageKey` so different pages show different ads.
 * @param pageKey unique identifier per page (e.g. "home", "explore")
 * @param limit max ads to return for this page
 */
export function useActiveAds(pageKey: string, limit: number = 5) {
  return useQuery({
    queryKey: ["active-ads-weighted", pageKey, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ads")
        .select("*")
        .eq("status", "active")
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Weighted random shuffle: higher stars_paid = higher chance of appearing first
      // Each call produces a unique shuffle since Math.random() is independent
      const weighted = data.map((ad) => ({
        ...ad,
        _weight: Math.random() * Math.sqrt(ad.stars_paid || 1),
      }));
      weighted.sort((a, b) => b._weight - a._weight);

      return weighted.slice(0, limit);
    },
    staleTime: 30_000, // re-shuffle every 30s
  });
}

/**
 * Helper: given a list index, determine if an ad should be inserted before this item.
 * Returns the ad to show, or null.
 */
export function getAdForIndex(
  idx: number,
  ads: any[] | undefined,
  every: number = 6
): any | null {
  if (!ads || ads.length === 0 || idx === 0) return null;
  if (idx % every !== 0) return null;
  const adIdx = Math.floor(idx / every) - 1;
  return adIdx < ads.length ? ads[adIdx] : null;
}
