import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { List, Receipt, Settings, ChevronRight, Heart, AlertTriangle, BarChart3, ShieldCheck, Megaphone } from "lucide-react";
import { useTelegramUser, triggerHaptic } from "@/hooks/useTelegramUser";
import { useLanguage } from "@/context/LanguageContext";
import { useAdmin } from "@/hooks/useAdmin";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useVerifiedSeller } from "@/hooks/useVerifiedSeller";

const menuItems = [
  { label: "Dashboard", desc: "Sales stats & analytics", icon: BarChart3, path: "/profile/dashboard" },
  { label: "My Listings", desc: "View and manage your posts", icon: List, path: "/profile/listings" },
  { label: "My Ads", desc: "Manage your sponsored ads", icon: Megaphone, path: "/profile/ads" },
  { label: "My Favorites", desc: "Listings you've saved", icon: Heart, path: "/favorites" },
  { label: "My Transactions", desc: "Your purchase & sales history", icon: Receipt, path: "/profile/transactions" },
  { label: "Settings", desc: "Account preferences", icon: Settings, path: "/profile/settings" },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const Profile = () => {
  const { user, isGuest } = useTelegramUser();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const initials = user.first_name.charAt(0).toUpperCase();
  const { data: verifiedData } = useVerifiedSeller(user.id);
  const { t } = useLanguage();

  return (
    <div className="px-5 pt-4">
      {/* Avatar + Name */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center mb-8"
      >
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20 mb-4 overflow-hidden">
          {user.photo_url ? (
            <img src={user.photo_url} alt={user.first_name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-white">{initials}</span>
          )}
        </div>
        <h1 className="text-xl font-extrabold text-foreground flex items-center gap-1.5">
          {t("home.hi")}, {user.first_name} 👋
          {verifiedData && <VerifiedBadge size="md" />}
        </h1>
        {user.username ? (
          <p className="text-primary font-semibold text-sm mt-1">@{user.username}</p>
        ) : (
          <p className="text-muted-foreground text-sm mt-1">No username set</p>
        )}
      </motion.div>

      {/* Guest Warning */}
      {isGuest && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-foreground">{t("profile.not_connected") || "Not connected to Telegram"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("home.guest_link")}
            </p>
            <button
              onClick={() => {
                const marketBot = import.meta.env.VITE_MARKET_BOT_USERNAME || "TrustPayMarketsBot";
                window.open(`https://t.me/${marketBot}`, "_blank");
              }}
              className="mt-3 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
            >
              {t("profile.open_telegram") || "Open in Telegram"}
            </button>
          </div>
        </motion.div>
      )}

      {/* Admin Link */}
      {isAdmin && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 1.02 }}
          onClick={() => { triggerHaptic("medium"); navigate("/admin"); }}
          className="mb-4 flex items-center gap-4 p-5 rounded-2xl bg-primary/10 border border-primary/30 shadow-sm text-left w-full"
        >
          <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-primary">Admin Panel</p>
            <p className="text-xs text-primary/70 mt-0.5">Manage marketplace</p>
          </div>
          <ChevronRight className="w-4 h-4 text-primary shrink-0" />
        </motion.button>
      )}

      {/* Menu */}
      <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-3">
        {([
          { label: t("profile.dashboard"), desc: "Sales stats & analytics", icon: BarChart3, path: "/profile/dashboard" },
          { label: t("profile.my_listings"), desc: "View and manage your posts", icon: List, path: "/profile/listings" },
          { label: t("profile.my_ads"), desc: "Manage your sponsored ads", icon: Megaphone, path: "/profile/ads" },
          { label: t("profile.favorites"), desc: "Listings you've saved", icon: Heart, path: "/favorites" },
          { label: t("profile.transactions"), desc: "Your purchase & sales history", icon: Receipt, path: "/profile/transactions" },
          { label: t("profile.settings"), desc: "Account preferences", icon: Settings, path: "/profile/settings" },
        ]).map((mi) => {
          const Icon = mi.icon;
          return (
            <motion.button
              key={mi.label}
              variants={item}
              whileTap={{ scale: 1.02 }}
              onClick={() => {
                triggerHaptic("light");
                navigate(mi.path);
              }}
              className="flex items-center gap-4 p-5 rounded-2xl bg-card border border-border/50 shadow-sm active:shadow-md transition-shadow text-left"
            >
              <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">{mi.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{mi.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
};

export default Profile;
