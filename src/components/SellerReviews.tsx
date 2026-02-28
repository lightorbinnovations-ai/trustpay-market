import { motion } from "framer-motion";
import StarRating from "@/components/StarRating";
import { useSellerReviews, useSellerRating } from "@/hooks/useReviews";
import { Loader2 } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

const SellerReviews = ({ sellerTelegramId }: { sellerTelegramId: number }) => {
  const { data: reviews, isLoading } = useSellerReviews(sellerTelegramId);
  const { avg, count } = useSellerRating(sellerTelegramId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  if (!reviews || reviews.length === 0) return null;

  return (
    <motion.div variants={fadeUp} className="mt-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-foreground">Seller Reviews</h2>
        <div className="flex items-center gap-1.5">
          <StarRating rating={Math.round(avg)} size="sm" />
          <span className="text-xs font-semibold text-muted-foreground">
            {avg} ({count})
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        {reviews.slice(0, 5).map((review: any) => (
          <div key={review.id} className="p-3.5 rounded-xl bg-card border border-border/50 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-foreground">
                {review.bot_users?.username ? `@${review.bot_users.username}` : review.bot_users?.first_name || "Buyer"}
              </span>
              <StarRating rating={review.rating} size="sm" />
            </div>
            {review.comment && (
              <p className="text-xs text-muted-foreground leading-relaxed">{review.comment}</p>
            )}
            <p className="text-[10px] text-muted-foreground/60 mt-1.5">
              {new Date(review.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default SellerReviews;
