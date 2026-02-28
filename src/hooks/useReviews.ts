import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useSellerReviews = (sellerTelegramId: number | undefined) => {
  return useQuery({
    queryKey: ["seller-reviews", sellerTelegramId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, bot_users!reviews_reviewer_telegram_id_fkey(first_name, username)")
        .eq("seller_telegram_id", sellerTelegramId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!sellerTelegramId,
  });
};

export const useSellerRating = (sellerTelegramId: number | undefined) => {
  const { data: reviews } = useSellerReviews(sellerTelegramId);
  if (!reviews || reviews.length === 0) return { avg: 0, count: 0 };
  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  return { avg: Math.round(avg * 10) / 10, count: reviews.length };
};

export const useTransactionReview = (transactionId: string | undefined) => {
  return useQuery({
    queryKey: ["transaction-review", transactionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("transaction_id", transactionId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!transactionId,
  });
};

export const useSubmitReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (review: {
      transaction_id: string;
      reviewer_telegram_id: number;
      seller_telegram_id: number;
      listing_id: string;
      rating: number;
      comment?: string;
    }) => {
      const { error } = await supabase.from("reviews").insert(review);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["seller-reviews", variables.seller_telegram_id] });
      queryClient.invalidateQueries({ queryKey: ["transaction-review", variables.transaction_id] });
      queryClient.invalidateQueries({ queryKey: ["my-transactions"] });
    },
  });
};
