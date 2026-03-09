import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, XCircle, Info, User, DollarSign, Clock, Loader2, CheckCircle, AlertTriangle, Package, Copy, ExternalLink, ChevronRight } from "lucide-react";
import { useTelegramUser, triggerHaptic } from "@/hooks/useTelegramUser";
import { formatNaira } from "@/lib/currency";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notifyTransactionStarted } from "@/hooks/useNotifications";
import { toast } from "@/hooks/use-toast";
import { useListingThumbnail } from "@/hooks/useListingImages";
import ListingImage from "@/components/ListingImage";
import { useEffect } from "react";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

const statusConfig: Record<string, { icon: typeof Clock; label: string; color: string; desc: string }> = {
  pending: { icon: Clock, label: "Pending", color: "text-amber-500", desc: "Waiting for payment confirmation" },
  paid: { icon: Shield, label: "Paid — In Escrow", color: "text-blue-500", desc: "Payment held securely. Awaiting delivery." },
  released: { icon: CheckCircle, label: "Released", color: "text-emerald-500", desc: "Payment released to seller. Transaction complete!" },
  disputed: { icon: AlertTriangle, label: "Disputed", color: "text-destructive", desc: "Dispute raised. Admin is reviewing." },
  refunded: { icon: DollarSign, label: "Refunded", color: "text-muted-foreground", desc: "Payment has been refunded." },
};

const generateToken = (length = 12) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
};

const Checkout = () => {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const { user } = useTelegramUser();

  // Real-time subscription for transaction status changes
  const thumbnail = useListingThumbnail(listingId);

  const { data: listing, isLoading } = useQuery({
    queryKey: ["checkout-listing", listingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", listingId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!listingId,
  });

  const { data: seller } = useQuery({
    queryKey: ["checkout-seller", listing?.seller_telegram_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bot_users")
        .select("*")
        .eq("telegram_id", listing!.seller_telegram_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!listing?.seller_telegram_id,
  });

  // Fetch existing transaction for this listing+buyer
  const { data: existingTx } = useQuery({
    queryKey: ["checkout-tx", listingId, user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("listing_id", listingId!)
        .eq("buyer_telegram_id", user.id)
        .is("boost_listing_id", null)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!listingId && user.id !== 0,
  });

  // Real-time subscription for transaction status changes
  useEffect(() => {
    if (!existingTx?.id) return;

    const channel = supabase
      .channel(`tx-${existingTx.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "transactions",
          filter: `id=eq.${existingTx.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["checkout-tx", listingId, user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [existingTx?.id, listingId, user.id, queryClient]);

  const startEscrow = useMutation({
    mutationFn: async () => {
      if (!listing || user.id === 0) throw new Error("Not ready");

      const initData = window.Telegram?.WebApp?.initData;
      if (!initData) throw new Error("Telegram authentication missing");

      const payload = {
        listing_id: listing.id,
        seller_telegram_id: listing.seller_telegram_id,
        amount: listing.price || 0,
        type: 'escrow',
        status: "pending",
      };

      const { data, error } = await supabase.functions.invoke('market-actions', {
        body: {
          action: 'create_transaction',
          payload
        },
        headers: {
          'x-telegram-init-data': initData
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await notifyTransactionStarted(
        listing.id,
        listing.title,
        listing.seller_telegram_id,
        user.first_name,
        user.id,
        listing.price || 0
      );

      return data.transaction;
    },
    onSuccess: (tx) => {
      triggerHaptic("heavy");
      queryClient.invalidateQueries({ queryKey: ["checkout-tx"] });
      toast({
        title: "🛡️ Escrow Initiated!",
        description: "Follow the steps below to complete payment.",
        duration: 5000
      });
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      if (!existingTx) return;
      const initData = window.Telegram?.WebApp?.initData;
      const { data, error } = await supabase.functions.invoke('market-actions', {
        body: {
          action: 'update_transaction_status',
          payload: { id: existingTx.id, status }
        },
        headers: { 'x-telegram-init-data': initData }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkout-tx"] });
      triggerHaptic("medium");
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-5">
        <h2 className="text-lg font-bold text-foreground">Listing not found</h2>
        <button onClick={() => navigate("/home")} className="mt-4 text-primary font-semibold text-sm">Go Home</button>
      </div>
    );
  }

  if (startEscrow.isSuccess || (existingTx && txStatus === "pending")) {
    const sName = seller?.username ? `@${seller.username}` : seller?.first_name || "Seller";
    const amount = listing.price || 0;

    return (
      <div className="flex flex-col min-h-[90vh] pb-10">
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Next Steps</h2>
            <p className="text-muted-foreground text-sm max-w-[300px]">
              Follow these simple steps to complete your secure payment in the Escrow Bot.
            </p>
          </motion.div>
        </div>

        <div className="px-5 space-y-4">
          {/* Step 1: Info */}
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xs font-bold">1</div>
              <p className="font-semibold text-sm italic">Copy the details below</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Seller username</p>
                  <p className="font-mono text-sm">{sName}</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(sName);
                    toast({ title: "Copied!", duration: 1000 });
                  }}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                >
                  <Copy className="w-4 h-4 text-primary" />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Amount to Pay</p>
                  <p className="font-mono text-sm font-bold">{formatNaira(amount)}</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(amount.toString());
                    toast({ title: "Copied!", duration: 1000 });
                  }}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                >
                  <Copy className="w-4 h-4 text-primary" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Step 2: Open Bot */}
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xs font-bold">2</div>
              <p className="font-semibold text-sm italic">Create the deal in Escrow Bot</p>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Open the Escrow Bot and use "New Deal" with the details above.</p>

            <button
              onClick={() => {
                triggerHaptic("light");
                const escrowBot = import.meta.env.VITE_ESCROW_BOT_USERNAME || "TrustPay9jaBot";
                const botLink = `https://t.me/${escrowBot}`;
                if (window.Telegram?.WebApp?.openTelegramLink) {
                  window.Telegram.WebApp.openTelegramLink(botLink);
                } else {
                  window.open(botLink, "_blank");
                }
              }}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm"
            >
              Open Escrow Bot <ExternalLink className="w-4 h-4" />
            </button>
          </motion.div>

          {/* Step 3: Complete */}
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="bg-card border border-border rounded-2xl p-4 shadow-sm border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-6 h-6 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 text-xs font-bold">3</div>
              <p className="font-semibold text-sm">Automatic Confirmation</p>
            </div>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Once you confirm delivery in the Escrow Bot, this page will <b>automatically update</b> to the success screen.
            </p>

            <button
              disabled={true}
              className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 cursor-default opacity-80"
            >
              <Clock className="w-4 h-4 animate-pulse" />
              Waiting for Escrow Release...
            </button>
          </motion.div>

          <button
            onClick={() => navigate("/home")}
            className="flex items-center justify-center gap-2 w-full py-3 text-muted-foreground text-sm font-medium hover:text-foreground"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  const sellerName = seller?.username ? `@${seller.username}` : seller?.first_name || "Seller";
  const txStatus = existingTx?.status || null;
  const statusInfo = txStatus ? statusConfig[txStatus] : null;

  return (
    <div className="px-5 pt-4 pb-8">
      <motion.div variants={container} initial="hidden" animate="show">
        {/* Header */}
        <motion.div variants={fadeUp}>
          <h1 className="text-xl font-extrabold text-foreground">TrustPay Escrow</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {txStatus ? "Track your escrow payment" : "Review and confirm your secure payment"}
          </p>
        </motion.div>

        {/* Live Status Banner */}
        {statusInfo && (
          <motion.div
            variants={fadeUp}
            className={`mt-5 flex items-center gap-3 p-4 rounded-2xl border ${txStatus === "released" ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800" :
              txStatus === "disputed" ? "bg-destructive/5 border-destructive/20" :
                txStatus === "paid" ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800" :
                  "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
              }`}
          >
            <statusInfo.icon className={`w-6 h-6 shrink-0 ${statusInfo.color}`} />
            <div>
              <p className={`text-sm font-bold ${statusInfo.color}`}>{statusInfo.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{statusInfo.desc}</p>
            </div>
          </motion.div>
        )}

        {/* Listing Summary */}
        <motion.div variants={fadeUp} className="flex items-center gap-4 mt-5 p-4 rounded-2xl bg-card border border-border/50 shadow-sm">
          <div className="w-16 h-16 rounded-xl bg-secondary shrink-0 overflow-hidden">
            <ListingImage src={thumbnail} alt={listing.title} className="w-full h-full" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{listing.title}</p>
            <p className="text-lg font-extrabold text-primary mt-0.5">{formatNaira(listing.price || 0)}</p>
            <p className="text-xs text-muted-foreground">{sellerName}</p>
          </div>
        </motion.div>

        {/* Escrow Details */}
        <motion.div variants={fadeUp} className="mt-5 rounded-2xl bg-card border border-border/50 shadow-sm overflow-hidden">
          <div className="bg-accent px-5 py-3">
            <p className="text-sm font-bold text-accent-foreground">Escrow Details</p>
          </div>
          <div className="p-5 flex flex-col gap-4">
            {[
              { icon: User, label: "Buyer", value: `@${user.username || user.first_name}` },
              { icon: User, label: "Seller", value: sellerName },
              { icon: DollarSign, label: "Amount", value: formatNaira(listing.price || 0) },
              { icon: Clock, label: "Status", value: statusInfo?.label || "Not Started" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <row.icon className="w-4 h-4" /> {row.label}
                </span>
                <span className={`text-sm font-semibold ${row.label === "Status" ? (statusInfo?.color || "text-muted-foreground") : "text-foreground"
                  }`}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Escrow Timeline */}
        {txStatus && (
          <motion.div variants={fadeUp} className="mt-5 rounded-2xl bg-card border border-border/50 shadow-sm p-5">
            <p className="text-sm font-bold text-foreground mb-4">Escrow Timeline</p>
            <div className="flex flex-col gap-0">
              {[
                { step: "pending", label: "Payment Initiated", icon: Clock },
                { step: "paid", label: "Payment in Escrow", icon: Shield },
                { step: "released", label: "Payment Released", icon: CheckCircle },
              ].map((s, i) => {
                const steps = ["pending", "paid", "released"];
                const currentIdx = steps.indexOf(txStatus === "disputed" ? "paid" : txStatus || "");
                const stepIdx = steps.indexOf(s.step);
                const isActive = stepIdx <= currentIdx;
                const isDisputed = txStatus === "disputed" && s.step === "released";
                const Icon = isDisputed ? AlertTriangle : s.icon;

                return (
                  <div key={s.step} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDisputed ? "bg-destructive/10" :
                        isActive ? "bg-primary/10" : "bg-secondary"
                        }`}>
                        <Icon className={`w-4 h-4 ${isDisputed ? "text-destructive" :
                          isActive ? "text-primary" : "text-muted-foreground/40"
                          }`} />
                      </div>
                      {i < 2 && (
                        <div className={`w-0.5 h-6 ${isActive && stepIdx < currentIdx ? "bg-primary/30" : "bg-border"}`} />
                      )}
                    </div>
                    <div className="pt-1.5">
                      <p className={`text-xs font-semibold ${isDisputed ? "text-destructive" :
                        isActive ? "text-foreground" : "text-muted-foreground/50"
                        }`}>
                        {isDisputed ? "Disputed" : s.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div variants={fadeUp} className="flex flex-col gap-3 mt-6">
          {!txStatus || txStatus === "pending" ? (
            <>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  triggerHaptic("heavy");
                  if (txStatus === "pending") {
                    // Already have a pending tx, just open the bot
                    const escrowBot = import.meta.env.VITE_ESCROW_BOT_USERNAME || "TrustPay9jaBot";
                    const deepLink = `https://t.me/${escrowBot}?start=escrow_${listing.id}`;

                    if (window.Telegram?.WebApp?.openTelegramLink) {
                      window.Telegram.WebApp.openTelegramLink(deepLink);
                    } else {
                      window.open(deepLink, "_blank");
                    }
                  } else {
                    startEscrow.mutate();
                  }
                }}
                disabled={startEscrow.isPending}
                className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-base shadow-lg shadow-primary/25 disabled:opacity-60"
              >
                {startEscrow.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Shield className="w-5 h-5" />
                )}
                {txStatus === "pending" ? "Continue in Escrow Bot" : startEscrow.isPending ? "Processing..." : "Send Payment to Escrow"}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { triggerHaptic("light"); navigate(-1); }}
                className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-card border border-border text-muted-foreground font-semibold text-base shadow-sm"
              >
                <XCircle className="w-5 h-5" /> Cancel Transaction
              </motion.button>
            </>
          ) : txStatus === "paid" ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                triggerHaptic("light");
                const escrowBot = import.meta.env.VITE_ESCROW_BOT_USERNAME || "TrustPay9jaBot";
                window.open(`https://t.me/${escrowBot}`, "_blank");
              }}
              className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-base shadow-lg shadow-primary/25"
            >
              <Package className="w-5 h-5" /> Open Escrow Bot
            </motion.button>
          ) : txStatus === "released" ? (
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-4 p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/20">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold">Sale Successful!</h3>
              <p className="text-sm text-muted-foreground text-center">This transaction has been successfully recorded in the dashboard.</p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { triggerHaptic("light"); navigate("/home"); }}
                className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-emerald-500 text-white font-semibold text-base shadow-lg shadow-emerald-500/25"
              >
                Return to Shop
              </motion.button>
            </motion.div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                triggerHaptic("light");
                const supportBot = import.meta.env.VITE_SUPPORT_BOT_USERNAME || "TrustPaySupport";
                window.open(`https://t.me/${supportBot}`, "_blank");
              }}
              className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-destructive text-destructive-foreground font-semibold text-base shadow-lg shadow-destructive/25"
            >
              <AlertTriangle className="w-5 h-5" /> Contact Support
            </motion.button>
          )}
        </motion.div>

        {/* Info Tip */}
        <motion.div variants={fadeUp} className="flex flex-col gap-4 mt-6">
          <div className="p-4 rounded-2xl bg-accent/30 border border-primary/20">
            <p className="text-[11px] text-muted-foreground leading-relaxed text-center">
              <span className="font-bold text-primary">Note:</span> If you're not sure, kindly talk to us <a href="https://t.me/lightorbinnovations" target="_blank" className="font-bold text-primary underline">@lightorbinnovations</a> or call us at <a href="tel:08025100844" className="font-bold text-primary underline">08025100844</a> so we can serve as escrow between you and the seller to avoid scam.
            </p>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-accent/50 border border-border/30">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Payment will be held securely in escrow and released to the seller only after you confirm delivery. Your funds are protected.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Checkout;
