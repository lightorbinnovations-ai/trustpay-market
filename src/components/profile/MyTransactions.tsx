import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowDownLeft, ArrowUpRight, Star } from "lucide-react";
import { formatNaira } from "@/lib/currency";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTelegramUser } from "@/hooks/useTelegramUser";
import { useTransactionReview } from "@/hooks/useReviews";
import ReviewForm from "@/components/ReviewForm";
import StarRating from "@/components/StarRating";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  paid: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  released: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled: "bg-secondary text-muted-foreground",
  disputed: "bg-destructive/10 text-destructive",
};

const MyTransactions = () => {
  const { user } = useTelegramUser();

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["my-transactions", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*, listings(title)")
        .or(`buyer_telegram_id.eq.${user.id},seller_telegram_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: user.id !== 0,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-5">
          <span className="text-3xl">💸</span>
        </div>
        <h2 className="text-lg font-bold text-foreground">Escrow Coming Soon</h2>
        <p className="text-muted-foreground text-sm mt-2 max-w-[240px]">
          Your secure escrow payment history will appear here once launched!
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-3">
      {transactions.map((tx: any) => (
        <TransactionCard key={tx.id} tx={tx} userId={user.id} />
      ))}
    </motion.div>
  );
};

const TransactionCard = ({ tx, userId }: { tx: any; userId: number }) => {
  const isBuyer = tx.buyer_telegram_id === userId;
  const [showReview, setShowReview] = useState(false);
  const { data: existingReview } = useTransactionReview(tx.id);
  const canReview = isBuyer && (tx.status === "released" || tx.status === "paid") && !existingReview;

  return (
    <motion.div variants={fadeUp} className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
      <div className="flex items-center gap-4 p-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isBuyer ? "bg-destructive/10" : "bg-emerald-100 dark:bg-emerald-900/30"
          }`}>
          {isBuyer ? (
            <ArrowUpRight className="w-5 h-5 text-destructive" />
          ) : (
            <ArrowDownLeft className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">
            {tx.listings?.title || "Listing"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isBuyer ? "You paid" : "You received"} · {new Date(tx.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-sm font-bold ${isBuyer ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
            {isBuyer ? "-" : "+"}{formatNaira(tx.amount)}
          </p>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[tx.status] || "bg-secondary text-muted-foreground"}`}>
            {tx.status}
          </span>
        </div>
      </div>

      {/* Existing review display */}
      {existingReview && (
        <div className="px-4 pb-3 flex items-center gap-2">
          <StarRating rating={existingReview.rating} size="sm" />
          <span className="text-xs text-muted-foreground">Your review</span>
        </div>
      )}

      {/* Review prompt for eligible transactions */}
      {canReview && !showReview && (
        <div className="px-4 pb-3">
          <button
            onClick={() => setShowReview(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary"
          >
            <Star className="w-3.5 h-3.5" /> Rate this seller
          </button>
        </div>
      )}

      {/* Review form */}
      <AnimatePresence>
        {showReview && (
          <div className="px-4 pb-4">
            <ReviewForm
              transactionId={tx.id}
              reviewerTelegramId={userId}
              sellerTelegramId={tx.seller_telegram_id}
              listingId={tx.listing_id}
              onSubmitted={() => setShowReview(false)}
            />
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MyTransactions;
