import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, DollarSign, Check, Loader2, Heart, PartyPopper, MapPin, Rocket, X } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { triggerHaptic } from "@/hooks/useTelegramUser";

const iconMap: Record<string, typeof Eye> = {
  listing_view: Eye,
  transaction_started: DollarSign,
  favorite_added: Heart,
  welcome: PartyPopper,
  new_listing_nearby: MapPin,
  boost_activated: Rocket,
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const Notifications = () => {
  const navigate = useNavigate();
  const { notifications, isLoading, unreadCount, markAsRead, markAllRead, deleteNotification } = useNotifications();

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="px-5 pt-4 pb-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <h1 className="text-xl font-extrabold text-foreground">Notifications</h1>
        {unreadCount > 0 && (
          <button
            onClick={() => { triggerHaptic("light"); markAllRead.mutate(); }}
            className="flex items-center gap-1 text-xs font-semibold text-primary"
          >
            <Check className="w-3.5 h-3.5" /> Mark all read
          </button>
        )}
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : !notifications?.length ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-5">
            <span className="text-3xl">🔔</span>
          </div>
          <h2 className="text-lg font-bold text-foreground">No notifications yet</h2>
          <p className="text-muted-foreground text-sm mt-2">You'll be notified when someone views your listings</p>
        </motion.div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-2">
          {notifications.map((notif) => {
            const Icon = iconMap[notif.type] || Eye;
            return (
              <motion.div
                key={notif.id}
                variants={fadeUp}
                onClick={() => {
                  triggerHaptic("light");
                  if (!notif.is_read) markAsRead.mutate(notif.id);
                  if (notif.listing_id) navigate(`/listing/${notif.listing_id}`);
                }}
                className={`flex items-start gap-3 p-4 rounded-2xl border shadow-sm cursor-pointer transition-colors ${
                  notif.is_read
                    ? "bg-card border-border/50"
                    : "bg-accent/30 border-primary/20"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  notif.type === "transaction_started" ? "bg-primary/10"
                  : notif.type === "favorite_added" ? "bg-destructive/10"
                  : notif.type === "welcome" ? "bg-amber-500/10"
                  : notif.type === "new_listing_nearby" ? "bg-emerald-500/10"
                  : notif.type === "boost_activated" ? "bg-primary/10"
                  : "bg-accent"
                }`}>
                  <Icon className={`w-5 h-5 ${
                    notif.type === "transaction_started" ? "text-primary" 
                    : notif.type === "favorite_added" ? "text-destructive"
                    : notif.type === "welcome" ? "text-amber-500"
                    : notif.type === "new_listing_nearby" ? "text-emerald-500"
                    : notif.type === "boost_activated" ? "text-primary"
                    : "text-muted-foreground"
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-foreground">{notif.title}</p>
                    {!notif.is_read && (
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {notif.message.split(/(@\w+)/g).map((part, i) =>
                      part.startsWith("@") ? (
                        <a
                          key={i}
                          href={`https://t.me/${part.slice(1)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-primary font-semibold"
                        >
                          {part}
                        </a>
                      ) : (
                        <span key={i}>{part}</span>
                      )
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(notif.created_at)}</p>
                </div>
                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic("light");
                    deleteNotification.mutate(notif.id);
                  }}
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 hover:bg-destructive/10 transition-colors mt-0.5"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
};

export default Notifications;
