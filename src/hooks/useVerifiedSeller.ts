import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Check if a seller is currently verified (badge not expired).
 */
export function useVerifiedSeller(telegramId: number | undefined) {
  return useQuery({
    queryKey: ["verified-seller", telegramId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verified_sellers")
        .select("*")
        .eq("telegram_id", telegramId!)
        .gte("expires_at", new Date().toISOString())
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!telegramId && telegramId !== 0,
    staleTime: 60_000,
  });
}

/**
 * Batch check verification for multiple seller IDs.
 */
export function useVerifiedSellers(telegramIds: number[]) {
  return useQuery({
    queryKey: ["verified-sellers-batch", telegramIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verified_sellers")
        .select("telegram_id")
        .in("telegram_id", telegramIds)
        .gte("expires_at", new Date().toISOString());
      if (error) throw error;
      const set = new Set(data?.map((d) => d.telegram_id) || []);
      return set;
    },
    enabled: telegramIds.length > 0,
    staleTime: 60_000,
  });
}
