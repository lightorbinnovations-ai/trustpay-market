import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import StarRating from "@/components/StarRating";
import { useSubmitReview } from "@/hooks/useReviews";
import { triggerHaptic } from "@/hooks/useTelegramUser";
import { toast } from "@/hooks/use-toast";

interface ReviewFormProps {
  transactionId: string;
  reviewerTelegramId: number;
  sellerTelegramId: number;
  listingId: string;
  onSubmitted?: () => void;
}

const ReviewForm = ({ transactionId, reviewerTelegramId, sellerTelegramId, listingId, onSubmitted }: ReviewFormProps) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const submit = useSubmitReview();

  const handleSubmit = () => {
    if (rating === 0) {
      toast({ title: "Please select a rating", variant: "destructive" });
      return;
    }
    triggerHaptic("heavy");
    submit.mutate(
      {
        transaction_id: transactionId,
        reviewer_telegram_id: reviewerTelegramId,
        seller_telegram_id: sellerTelegramId,
        listing_id: listingId,
        rating,
        comment: comment.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast({ title: "Review submitted ⭐" });
          onSubmitted?.();
        },
        onError: (err: any) => {
          toast({ title: "Failed to submit", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-2xl bg-card border border-border/50 shadow-sm"
    >
      <p className="text-sm font-bold text-foreground mb-3">Rate this seller</p>
      <StarRating rating={rating} onRate={setRating} />
      <Textarea
        placeholder="Leave a comment (optional)..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="mt-3 bg-secondary/50 border-border/50 text-sm min-h-[60px]"
        maxLength={300}
      />
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleSubmit}
        disabled={submit.isPending || rating === 0}
        className="flex items-center justify-center gap-2 w-full mt-3 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50"
      >
        {submit.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {submit.isPending ? "Submitting..." : "Submit Review"}
      </motion.button>
    </motion.div>
  );
};

export default ReviewForm;
