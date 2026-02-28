import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Loader2, TrendingUp, Package, DollarSign, Calendar, Rocket, Star, Clock } from "lucide-react";
import { formatNaira } from "@/lib/currency";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTelegramUser } from "@/hooks/useTelegramUser";

type DateFilter = "week" | "month" | "all" | "custom";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const SellerDashboard = () => {
  const { user } = useTelegramUser();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<DateFilter>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["seller-transactions", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*, listings(title)")
        .eq("seller_telegram_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: user.id !== 0,
  });

  const { data: listings } = useQuery({
    queryKey: ["seller-listing-count", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("id, status, boosted_until, title")
        .eq("seller_telegram_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: user.id !== 0,
  });

  // Boost transactions (where buyer = seller, i.e. self-purchase for boost)
  const { data: boostTransactions } = useQuery({
    queryKey: ["seller-boost-txns", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*, listings:boost_listing_id(title)")
        .eq("buyer_telegram_id", user.id)
        .not("boost_listing_id", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: user.id !== 0,
  });

  const filtered = useMemo(() => {
    if (!transactions) return [];
    const now = new Date();
    let from: Date | null = null;

    if (filter === "week") {
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (filter === "month") {
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (filter === "custom" && customFrom) {
      from = new Date(customFrom);
    }

    let to: Date | null = null;
    if (filter === "custom" && customTo) {
      to = new Date(customTo + "T23:59:59");
    }

    return transactions.filter((tx) => {
      const d = new Date(tx.created_at);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [transactions, filter, customFrom, customTo]);

  const stats = useMemo(() => {
    const completed = filtered.filter((tx) => tx.status === "released" || tx.status === "paid");
    const totalRevenue = completed.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const pending = filtered.filter((tx) => tx.status === "pending").length;
    // Count sold items from listings status, not transactions
    const totalSold = listings?.filter((l) => l.status === "sold").length ?? 0;
    return { totalRevenue, totalSold, pending };
  }, [filtered, listings]);

  const activeListings = listings?.filter((l) => l.status === "active").length ?? 0;
  const now = new Date();
  const activeBoostedListings = listings?.filter((l) => l.boosted_until && new Date(l.boosted_until) > now) ?? [];
  const totalBoostSpend = boostTransactions
    ?.filter((t) => t.status === "paid" || t.status === "released")
    .reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  const filterOptions: { label: string; value: DateFilter }[] = [
    { label: "This Week", value: "week" },
    { label: "This Month", value: "month" },
    { label: "All Time", value: "all" },
    { label: "Custom", value: "custom" },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-4">
      {/* Date filter */}
      <motion.div variants={fadeUp} className="flex gap-2 flex-wrap">
        {filterOptions.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              filter === f.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border/50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </motion.div>

      {filter === "custom" && (
        <motion.div variants={fadeUp} className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground mb-1 block">From</label>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-card border border-border/50 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground mb-1 block">To</label>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-card border border-border/50 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </motion.div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div variants={fadeUp} className="bg-card rounded-2xl p-4 border border-border/50 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-2">
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-[10px] text-muted-foreground uppercase font-medium">Revenue</p>
          <p className="text-lg font-extrabold text-foreground mt-0.5">{formatNaira(stats.totalRevenue)}</p>
        </motion.div>

        <motion.div variants={fadeUp} className="bg-card rounded-2xl p-4 border border-border/50 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-2">
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-[10px] text-muted-foreground uppercase font-medium">Items Sold</p>
          <p className="text-lg font-extrabold text-foreground mt-0.5">{stats.totalSold}</p>
        </motion.div>

        <motion.div variants={fadeUp} className="bg-card rounded-2xl p-4 border border-border/50 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-2">
            <Package className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-[10px] text-muted-foreground uppercase font-medium">Active Listings</p>
          <p className="text-lg font-extrabold text-foreground mt-0.5">{activeListings}</p>
        </motion.div>

        <motion.div variants={fadeUp} className="bg-card rounded-2xl p-4 border border-border/50 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center mb-2">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <p className="text-[10px] text-muted-foreground uppercase font-medium">Pending</p>
          <p className="text-lg font-extrabold text-foreground mt-0.5">{stats.pending}</p>
        </motion.div>
      </div>

      {/* Active Boosts Section */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Rocket className="w-4 h-4 text-primary" /> Active Boosts
          </h3>
          {totalBoostSpend > 0 && (
            <span className="text-[10px] font-semibold text-muted-foreground">
              Total spent: ⭐ {totalBoostSpend}
            </span>
          )}
        </div>

        {activeBoostedListings.length === 0 ? (
          <div className="bg-card rounded-2xl p-5 border border-dashed border-primary/30 text-center">
            <Rocket className="w-8 h-8 text-primary/40 mx-auto mb-2" />
            <p className="text-xs font-semibold text-foreground">No active boosts</p>
            <p className="text-[10px] text-muted-foreground mt-1">Boost your listings to get more visibility & sales</p>
            <button
              onClick={() => navigate("/profile/listings")}
              className="mt-3 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
            >
              Boost a Listing
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {activeBoostedListings.map((item) => {
              const expiresAt = new Date(item.boosted_until!);
              const hoursLeft = Math.max(0, Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)));
              const daysLeft = Math.floor(hoursLeft / 24);
              const timeLabel = daysLeft > 0 ? `${daysLeft}d ${hoursLeft % 24}h left` : `${hoursLeft}h left`;
              return (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                    <Rocket className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-semibold text-primary">{timeLabel}</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-primary/10 text-primary">LIVE</span>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Boost Payment History */}
      {boostTransactions && boostTransactions.length > 0 && (
        <motion.div variants={fadeUp}>
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
            <Star className="w-4 h-4 text-primary fill-primary" /> Boost Payments
          </h3>
          <div className="flex flex-col gap-2">
            {boostTransactions.slice(0, 5).map((tx: any) => (
              <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border/30">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                  <Star className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 fill-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{tx.listings?.title || "Listing"}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-foreground">⭐ {tx.amount}</p>
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                    tx.status === "paid" || tx.status === "released"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : tx.status === "pending"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-secondary text-muted-foreground"
                  }`}>{tx.status}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent sales */}
      <motion.div variants={fadeUp}>
        <h3 className="text-sm font-bold text-foreground mb-3">Recent Sales</h3>
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No transactions in this period</p>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.slice(0, 10).map((tx: any) => (
              <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border/30">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{tx.listings?.title || "Listing"}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">+{formatNaira(tx.amount)}</p>
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                    tx.status === "released" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                    tx.status === "paid" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                    tx.status === "pending" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                    "bg-secondary text-muted-foreground"
                  }`}>{tx.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default SellerDashboard;
