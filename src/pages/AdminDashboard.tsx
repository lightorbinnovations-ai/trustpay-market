import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Users, Package, DollarSign, BarChart3, Trash2, Ban, CheckCircle, Loader2, Search, Eye, Rocket, Star, TrendingUp, Clock, AlertTriangle, Megaphone, BadgeCheck, Pause, Play } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/lib/currency";
import { triggerHaptic } from "@/hooks/useTelegramUser";
import { useAdmin } from "@/hooks/useAdmin";
import { toast } from "@/hooks/use-toast";
import { notifyTransactionStatusChange } from "@/hooks/useNotifications";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import VerifiedBadge from "@/components/VerifiedBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Tab = "overview" | "users" | "listings" | "transactions" | "boosts" | "ads" | "badges";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-5 text-center">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-5">
          <Ban className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Access Denied</h2>
        <p className="text-muted-foreground text-sm mt-2">You don't have admin privileges.</p>
        <button onClick={() => navigate("/home")} className="mt-4 text-primary font-semibold text-sm">Go Home</button>
      </div>
    );
  }

  const tabs: { value: Tab; label: string; icon: typeof Users }[] = [
    { value: "overview", label: "Overview", icon: BarChart3 },
    { value: "users", label: "Users", icon: Users },
    { value: "listings", label: "Listings", icon: Package },
    { value: "boosts", label: "Boosts", icon: Rocket },
    { value: "ads", label: "Ads", icon: Megaphone },
    { value: "badges", label: "Badges", icon: BadgeCheck },
    { value: "transactions", label: "Txns", icon: DollarSign },
  ];

  return (
    <div className="px-5 pt-4 pb-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <button
          onClick={() => { triggerHaptic("light"); navigate(-1); }}
          className="w-9 h-9 rounded-full bg-card border border-border/50 flex items-center justify-center shadow-sm shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your marketplace</p>
        </div>
      </motion.div>


      <div className="flex gap-2 mt-5 overflow-x-auto scrollbar-none -mx-5 px-5 pb-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.value}
              onClick={() => { triggerHaptic("light"); setTab(t.value); }}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors ${tab === t.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border/50"
                }`}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {(tab === "users" || tab === "listings") && (
        <div className="flex items-center gap-2 bg-card rounded-2xl px-4 py-3 border border-border/50 shadow-sm mt-4">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === "users" ? "Search users..." : "Search listings..."}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      )}

      <div className="mt-5">
        {tab === "overview" && <OverviewTab />}
        {tab === "users" && <UsersTab search={search} />}
        {tab === "listings" && <ListingsTab search={search} />}
        {tab === "boosts" && <BoostsTab />}
        {tab === "ads" && <AdsTab />}
        {tab === "badges" && <BadgesTab />}
        {tab === "transactions" && <TransactionsTab />}
      </div>
    </div>
  );
};

// ─── Overview Tab with Chart + Revenue Breakdown ───
const OverviewTab = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [users, listings, transactions, reviews, ads, badges] = await Promise.all([
        supabase.from("bot_users").select("id", { count: "exact", head: true }),
        supabase.from("listings").select("id, status, boosted_until", { count: "exact" }),
        supabase.from("transactions").select("id, amount, status, boost_listing_id, created_at", { count: "exact" }),
        supabase.from("reviews").select("id", { count: "exact", head: true }),
        supabase.from("ads").select("id, status, stars_paid"),
        supabase.from("verified_sellers").select("id, stars_paid, expires_at"),
      ]);

      const activeListings = listings.data?.filter((l) => l.status === "active").length ?? 0;
      const soldListings = listings.data?.filter((l) => l.status === "sold").length ?? 0;
      const now = new Date().toISOString();
      const activeBoosted = listings.data?.filter((l) => l.boosted_until && l.boosted_until > now).length ?? 0;

      const completedTxns = transactions.data?.filter((t) => t.status === "released" || t.status === "paid") ?? [];
      const totalRevenue = completedTxns.reduce((sum, t) => sum + Number(t.amount), 0);

      const boostTxns = transactions.data?.filter((t) => t.boost_listing_id && (t.status === "paid" || t.status === "released")) ?? [];
      const boostRevenue = boostTxns.reduce((sum, t) => sum + Number(t.amount), 0);

      // Stars revenue
      const adStars = ads.data?.reduce((sum, a) => sum + (a.stars_paid || 0), 0) ?? 0;
      const activeAds = ads.data?.filter((a) => a.status === "active").length ?? 0;
      const badgeStars = badges.data?.reduce((sum, b) => sum + (b.stars_paid || 0), 0) ?? 0;
      const activeBadges = badges.data?.filter((b) => b.expires_at && b.expires_at > now).length ?? 0;

      // Build chart data: last 7 days
      const chartData: { day: string; txns: number; boosts: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString("en", { weekday: "short" });
        const dayTxns = transactions.data?.filter((t) => t.created_at.slice(0, 10) === dayStr && !t.boost_listing_id).length ?? 0;
        const dayBoosts = transactions.data?.filter((t) => t.created_at.slice(0, 10) === dayStr && t.boost_listing_id).length ?? 0;
        chartData.push({ day: label, txns: dayTxns, boosts: dayBoosts });
      }

      return {
        totalUsers: users.count ?? 0,
        totalListings: listings.count ?? 0,
        activeListings,
        soldListings,
        activeBoosted,
        totalTransactions: transactions.count ?? 0,
        totalRevenue,
        boostRevenue,
        totalReviews: reviews.count ?? 0,
        chartData,
        adStars,
        activeAds,
        badgeStars,
        activeBadges,
      };
    },
  });

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>;

  const cards = [
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" },
    { label: "Active Listings", value: stats?.activeListings ?? 0, icon: Package, color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" },
    { label: "Items Sold", value: stats?.soldListings ?? 0, icon: CheckCircle, color: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" },
    { label: "Total Revenue", value: formatNaira(stats?.totalRevenue ?? 0), icon: DollarSign, color: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" },
    { label: "Transactions", value: stats?.totalTransactions ?? 0, icon: TrendingUp, color: "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400" },
    { label: "Active Boosts", value: stats?.activeBoosted ?? 0, icon: Rocket, color: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400" },
    { label: "Active Ads", value: stats?.activeAds ?? 0, icon: Megaphone, color: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" },
    { label: "Verified Sellers", value: stats?.activeBadges ?? 0, icon: BadgeCheck, color: "bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400" },
    { label: "Total Reviews", value: stats?.totalReviews ?? 0, icon: Eye, color: "bg-secondary text-muted-foreground" },
  ];

  const totalStars = (stats?.boostRevenue ?? 0) + (stats?.adStars ?? 0) + (stats?.badgeStars ?? 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <motion.div key={c.label} variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-2xl p-4 border border-border/50 shadow-sm">
              <div className={`w-9 h-9 rounded-xl ${c.color} flex items-center justify-center mb-2`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-[10px] text-muted-foreground uppercase font-medium">{c.label}</p>
              <p className="text-lg font-extrabold text-foreground mt-0.5">{c.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Stars Revenue Breakdown */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-2xl p-4 border border-border/50 shadow-sm">
        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-1.5">
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> Stars Revenue Breakdown
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                <Rocket className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <span className="text-xs font-medium text-foreground">Boosts</span>
            </div>
            <span className="text-sm font-bold text-foreground">⭐ {stats?.boostRevenue ?? 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <Megaphone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <span className="text-xs font-medium text-foreground">Ads</span>
            </div>
            <span className="text-sm font-bold text-foreground">⭐ {stats?.adStars ?? 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <BadgeCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              </div>
              <span className="text-xs font-medium text-foreground">Verified Badges</span>
            </div>
            <span className="text-sm font-bold text-foreground">⭐ {stats?.badgeStars ?? 0}</span>
          </div>
          <div className="border-t border-border/50 pt-3 flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Total Stars Revenue</span>
            <span className="text-base font-extrabold text-primary">⭐ {totalStars}</span>
          </div>
        </div>
      </motion.div>

      {/* Activity Chart */}
      {stats?.chartData && (
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-2xl p-4 border border-border/50 shadow-sm">
          <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-primary" /> 7-Day Activity
          </h3>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="txns" name="Transactions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="boosts" name="Boosts" fill="hsl(var(--primary) / 0.4)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-3 justify-center">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <div className="w-3 h-3 rounded-sm bg-primary" /> Transactions
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <div className="w-3 h-3 rounded-sm bg-primary/40" /> Boosts
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// ─── Users Tab ───
const UsersTab = ({ search }: { search: string }) => {
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bot_users").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });

  const filtered = users?.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (u.first_name?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q) || u.telegram_id.toString().includes(q));
  }) ?? [];

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground mb-2">{filtered.length} user{filtered.length !== 1 ? "s" : ""}</p>
      {filtered.map((u) => (
        <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50">
          <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-sm font-bold text-primary">
            {u.first_name?.charAt(0).toUpperCase() || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground truncate">{u.first_name || "Unknown"}</p>
            <p className="text-[10px] text-muted-foreground">{u.username ? `@${u.username}` : `ID: ${u.telegram_id}`}</p>
          </div>
          <p className="text-[10px] text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
};

// ─── Listings Tab with Manual Boost/Un-boost ───
const ListingsTab = ({ search }: { search: string }) => {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const { data: listings, isLoading } = useQuery({
    queryKey: ["admin-listings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("listings").select("*, bot_users!listings_seller_telegram_id_fkey(first_name, username)").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("listings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
      toast({ title: "Listing removed" });
      setDeleteTarget(null);
    },
  });

  const boostMutation = useMutation({
    mutationFn: async ({ id, days }: { id: string; days: number }) => {
      const initData = window.Telegram?.WebApp?.initData;
      if (!initData) throw new Error("Telegram authentication missing");

      const boostedUntil = new Date();
      boostedUntil.setDate(boostedUntil.getDate() + days);

      const { data, error } = await supabase.functions.invoke('market-actions', {
        body: { action: 'admin_update_listing_boost', payload: { id, boosted_until: boostedUntil.toISOString() } },
        headers: { 'x-telegram-init-data': initData }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
      queryClient.invalidateQueries({ queryKey: ["admin-boosts"] });
      toast({ title: "Boost updated ✅" });
    },
  });

  const unboostMutation = useMutation({
    mutationFn: async (id: string) => {
      const initData = window.Telegram?.WebApp?.initData;
      if (!initData) throw new Error("Telegram authentication missing");

      const { data, error } = await supabase.functions.invoke('market-actions', {
        body: { action: 'admin_update_listing_boost', payload: { id, boosted_until: null } },
        headers: { 'x-telegram-init-data': initData }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
      queryClient.invalidateQueries({ queryKey: ["admin-boosts"] });
      toast({ title: "Boost removed" });
    },
  });

  const filtered = listings?.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return l.title.toLowerCase().includes(q) || l.category?.toLowerCase().includes(q) || l.city?.toLowerCase().includes(q);
  }) ?? [];

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>;

  const now = new Date();

  return (
    <>
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground mb-2">{filtered.length} listing{filtered.length !== 1 ? "s" : ""}</p>
        {filtered.map((l: any) => {
          const isBoosted = l.boosted_until && new Date(l.boosted_until) > now;
          return (
            <div key={l.id} className={`flex items-start gap-3 p-3 rounded-xl bg-card border ${isBoosted ? "border-primary/30 ring-1 ring-primary/10" : "border-border/50"}`}>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{l.title}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${l.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                    l.status === "sold" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
                      l.status === "paused" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                        "bg-secondary text-muted-foreground"
                    }`}>{l.status}</span>
                  <span className="text-[10px] text-primary font-semibold">{formatNaira(l.price || 0)}</span>
                  {isBoosted && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-0.5">
                      <Rocket className="w-2.5 h-2.5" /> Boosted
                    </span>
                  )}
                </div>
                {l.bot_users && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    by {l.bot_users.first_name || "Unknown"} {l.bot_users.username ? `(@${l.bot_users.username})` : ""}
                  </p>
                )}
                <div className="flex items-center gap-1.5 mt-2">
                  {isBoosted ? (
                    <button
                      onClick={() => { triggerHaptic("light"); unboostMutation.mutate(l.id); }}
                      className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-destructive/10 text-destructive"
                    >
                      Remove Boost
                    </button>
                  ) : (
                    <>
                      <button onClick={() => { triggerHaptic("light"); boostMutation.mutate({ id: l.id, days: 2 }); }} className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-primary/10 text-primary">+2d</button>
                      <button onClick={() => { triggerHaptic("light"); boostMutation.mutate({ id: l.id, days: 7 }); }} className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-primary/10 text-primary">+7d</button>
                      <button onClick={() => { triggerHaptic("light"); boostMutation.mutate({ id: l.id, days: 30 }); }} className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-primary/10 text-primary">+30d</button>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => { triggerHaptic("medium"); setDeleteTarget({ id: l.id, title: l.title }); }}
                className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </button>
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[320px] mx-auto rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Listing</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// ─── Boosts Tab ───
const BoostsTab = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-boosts"],
    queryFn: async () => {
      const [listingsRes, txnsRes] = await Promise.all([
        supabase.from("listings").select("id, title, boosted_until, seller_telegram_id, bot_users!listings_seller_telegram_id_fkey(first_name, username)")
          .not("boosted_until", "is", null)
          .order("boosted_until", { ascending: false })
          .limit(50),
        supabase.from("transactions").select("*, listings:boost_listing_id(title)")
          .not("boost_listing_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      if (listingsRes.error) throw listingsRes.error;
      if (txnsRes.error) throw txnsRes.error;
      return { listings: listingsRes.data, transactions: txnsRes.data };
    },
  });

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>;

  const now = new Date();
  const activeBoosts = data?.listings?.filter((l) => l.boosted_until && new Date(l.boosted_until) > now) ?? [];
  const expiredBoosts = data?.listings?.filter((l) => l.boosted_until && new Date(l.boosted_until) <= now) ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
          <Rocket className="w-4 h-4 text-primary" /> Active Boosts ({activeBoosts.length})
        </h3>
        {activeBoosts.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No active boosts right now</p>
        ) : (
          <div className="flex flex-col gap-2">
            {activeBoosts.map((l: any) => {
              const expiresAt = new Date(l.boosted_until!);
              const hoursLeft = Math.max(0, Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)));
              const daysLeft = Math.floor(hoursLeft / 24);
              const timeLabel = daysLeft > 0 ? `${daysLeft}d ${hoursLeft % 24}h left` : `${hoursLeft}h left`;
              return (
                <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                    <Rocket className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{l.title}</p>
                    {l.bot_users && (
                      <p className="text-[10px] text-muted-foreground">
                        {l.bot_users.first_name} {l.bot_users.username ? `(@${l.bot_users.username})` : ""}
                      </p>
                    )}
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
      </div>

      <div>
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
          <Star className="w-4 h-4 text-primary fill-primary" /> Boost Payments ({data?.transactions?.length ?? 0})
        </h3>
        {!data?.transactions?.length ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No boost payments yet</p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.transactions.map((tx: any) => (
              <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                  <Star className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 fill-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{tx.listings?.title || "Listing"}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Buyer: {tx.buyer_telegram_id} · {new Date(tx.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-foreground">⭐ {tx.amount}</p>
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${tx.status === "paid" || tx.status === "released"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : tx.status === "pending"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-secondary text-muted-foreground"
                    }`}>{tx.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {expiredBoosts.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-1.5">
            <Clock className="w-4 h-4" /> Expired Boosts ({expiredBoosts.length})
          </h3>
          <div className="flex flex-col gap-2">
            {expiredBoosts.slice(0, 10).map((l: any) => (
              <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border/30">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{l.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Expired: {new Date(l.boosted_until!).toLocaleDateString()}
                    {l.bot_users ? ` · ${l.bot_users.first_name}` : ""}
                  </p>
                </div>
                <span className="text-[9px] font-semibold px-2 py-1 rounded-full bg-secondary text-muted-foreground">Expired</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Ads Tab ───
const AdsTab = () => {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const { data: ads, isLoading } = useQuery({
    queryKey: ["admin-ads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ads").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      toast({ title: "Ad removed" });
      setDeleteTarget(null);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const initData = window.Telegram?.WebApp?.initData;
      if (!initData) throw new Error("Telegram authentication missing");

      const newStatus = currentStatus === "active" ? "paused" : "active";

      const { data, error } = await supabase.functions.invoke('market-actions', {
        body: { action: 'update_ad_status', payload: { id, status: newStatus } },
        headers: { 'x-telegram-init-data': initData }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      toast({ title: "Ad status updated" });
    },
  });

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>;

  const now = new Date();
  const totalStars = ads?.reduce((sum, a) => sum + (a.stars_paid || 0), 0) ?? 0;
  const activeCount = ads?.filter((a) => a.status === "active" && a.expires_at && new Date(a.expires_at) > now).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <div className="flex-1 bg-card rounded-2xl p-3 border border-border/50 text-center">
          <p className="text-[10px] text-muted-foreground uppercase font-medium">Total Ads</p>
          <p className="text-lg font-extrabold text-foreground">{ads?.length ?? 0}</p>
        </div>
        <div className="flex-1 bg-card rounded-2xl p-3 border border-border/50 text-center">
          <p className="text-[10px] text-muted-foreground uppercase font-medium">Active</p>
          <p className="text-lg font-extrabold text-primary">{activeCount}</p>
        </div>
        <div className="flex-1 bg-card rounded-2xl p-3 border border-border/50 text-center">
          <p className="text-[10px] text-muted-foreground uppercase font-medium">Stars</p>
          <p className="text-lg font-extrabold text-foreground">⭐ {totalStars}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {ads?.map((ad) => {
          const isActive = ad.status === "active" && ad.expires_at && new Date(ad.expires_at) > now;
          const isExpired = ad.expires_at && new Date(ad.expires_at) <= now;
          return (
            <div key={ad.id} className={`flex items-start gap-3 p-3 rounded-xl bg-card border ${isActive ? "border-indigo-300/50" : "border-border/50"}`}>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{ad.title}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                    isExpired ? "bg-secondary text-muted-foreground" :
                      ad.status === "paused" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                        "bg-secondary text-muted-foreground"
                    }`}>{isExpired ? "expired" : ad.status}</span>
                  <span className="text-[10px] text-foreground font-medium">⭐ {ad.stars_paid} · {ad.duration_days}d</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Owner: {ad.owner_telegram_id} · {new Date(ad.created_at).toLocaleDateString()}
                </p>
                {ad.expires_at && (
                  <p className="text-[10px] text-muted-foreground">
                    {isExpired ? "Expired" : "Expires"}: {new Date(ad.expires_at).toLocaleDateString()}
                  </p>
                )}
                <div className="flex items-center gap-1.5 mt-2">
                  {!isExpired && (
                    <button
                      onClick={() => { triggerHaptic("light"); toggleStatusMutation.mutate({ id: ad.id, currentStatus: ad.status }); }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 ${ad.status === "active" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        }`}
                    >
                      {ad.status === "active" ? <><Pause className="w-2.5 h-2.5" /> Pause</> : <><Play className="w-2.5 h-2.5" /> Resume</>}
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={() => { triggerHaptic("medium"); setDeleteTarget({ id: ad.id, title: ad.title }); }}
                className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </button>
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[320px] mx-auto rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ad</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ─── Badges Tab ───
const BadgesTab = () => {
  const queryClient = useQueryClient();

  const { data: badges, isLoading } = useQuery({
    queryKey: ["admin-badges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verified_sellers")
        .select("*, bot_users!inner(first_name, username, telegram_id)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) {
        // Fallback without join if FK doesn't exist
        const { data: fallback, error: err2 } = await supabase
          .from("verified_sellers")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);
        if (err2) throw err2;
        return fallback;
      }
      return data;
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("verified_sellers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-badges"] });
      toast({ title: "Badge revoked" });
    },
  });

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>;

  const now = new Date();
  const totalStars = badges?.reduce((sum: number, b: any) => sum + (b.stars_paid || 0), 0) ?? 0;
  const activeCount = badges?.filter((b: any) => b.expires_at && new Date(b.expires_at) > now).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <div className="flex-1 bg-card rounded-2xl p-3 border border-border/50 text-center">
          <p className="text-[10px] text-muted-foreground uppercase font-medium">Total Badges</p>
          <p className="text-lg font-extrabold text-foreground">{badges?.length ?? 0}</p>
        </div>
        <div className="flex-1 bg-card rounded-2xl p-3 border border-border/50 text-center">
          <p className="text-[10px] text-muted-foreground uppercase font-medium">Active</p>
          <p className="text-lg font-extrabold text-primary">{activeCount}</p>
        </div>
        <div className="flex-1 bg-card rounded-2xl p-3 border border-border/50 text-center">
          <p className="text-[10px] text-muted-foreground uppercase font-medium">Stars</p>
          <p className="text-lg font-extrabold text-foreground">⭐ {totalStars}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {badges?.map((b: any) => {
          const isActive = b.expires_at && new Date(b.expires_at) > now;
          const userName = b.bot_users?.first_name || `ID: ${b.telegram_id}`;
          const userHandle = b.bot_users?.username ? `@${b.bot_users.username}` : "";
          return (
            <div key={b.id} className={`flex items-center gap-3 p-3 rounded-xl bg-card border ${isActive ? "border-teal-300/50" : "border-border/50"}`}>
              <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
                <BadgeCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground truncate flex items-center gap-1">
                  {userName} {userHandle && <span className="text-muted-foreground font-normal">{userHandle}</span>}
                  {isActive && <VerifiedBadge size="sm" />}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  ⭐ {b.stars_paid} · {isActive ? `Expires ${new Date(b.expires_at).toLocaleDateString()}` : "Expired"}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-secondary text-muted-foreground"
                  }`}>{isActive ? "Active" : "Expired"}</span>
                {isActive && (
                  <button
                    onClick={() => { triggerHaptic("medium"); revokeMutation.mutate(b.id); }}
                    className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center"
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Transactions Tab ───
const TransactionsTab = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["admin-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*, listings!transactions_listing_id_fkey(title)")
        .is("boost_listing_id", null)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("transactions")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;

      const tx = transactions?.find((t: any) => t.id === id);
      if (tx) {
        notifyTransactionStatusChange(
          id,
          status,
          tx.buyer_telegram_id,
          tx.seller_telegram_id,
          tx.listings?.title || "Listing",
          tx.amount
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] });
      triggerHaptic("heavy");
      toast({ title: "Transaction updated ✅" });
    },
  });

  const filtered = transactions?.filter((tx: any) => {
    if (statusFilter === "all") return true;
    return tx.status === statusFilter;
  }) ?? [];

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>;

  const statusFilters = ["all", "pending", "paid", "released", "disputed", "refunded"];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {statusFilters.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border capitalize transition-colors ${statusFilter === s
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-foreground border-border/50"
              }`}
          >
            {s === "all" ? "All" : s} {s !== "all" && `(${transactions?.filter((t: any) => t.status === s).length ?? 0})`}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} transaction{filtered.length !== 1 ? "s" : ""}</p>

      {filtered.map((tx: any) => (
        <div key={tx.id} className={`rounded-xl bg-card border shadow-sm overflow-hidden ${tx.status === "disputed" ? "border-destructive/30 ring-1 ring-destructive/10" : "border-border/50"
          }`}>
          <div className="flex items-center gap-3 p-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground truncate">
                {tx.listings?.title || "Unknown Listing"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Buyer: {tx.buyer_telegram_id} → Seller: {tx.seller_telegram_id}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(tx.created_at).toLocaleString()}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatNaira(tx.amount)}</p>
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${tx.status === "released" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                tx.status === "paid" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                  tx.status === "pending" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                    tx.status === "disputed" ? "bg-destructive/10 text-destructive" :
                      tx.status === "refunded" ? "bg-secondary text-muted-foreground" :
                        "bg-secondary text-muted-foreground"
                }`}>{tx.status}</span>
            </div>
          </div>

          {(tx.status === "disputed" || tx.status === "paid") && (
            <div className="flex items-center gap-1.5 px-3 pb-3 border-t border-border/20 pt-2">
              {tx.status === "disputed" && (
                <>
                  <button
                    onClick={() => resolveMutation.mutate({ id: tx.id, status: "released" })}
                    disabled={resolveMutation.isPending}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  >
                    Release to Seller
                  </button>
                  <button
                    onClick={() => resolveMutation.mutate({ id: tx.id, status: "refunded" })}
                    disabled={resolveMutation.isPending}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-destructive/10 text-destructive"
                  >
                    Refund Buyer
                  </button>
                </>
              )}
              {tx.status === "paid" && (
                <button
                  onClick={() => resolveMutation.mutate({ id: tx.id, status: "released" })}
                  disabled={resolveMutation.isPending}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                >
                  Force Release
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AdminDashboard;
