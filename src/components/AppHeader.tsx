import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Bell, X, List, Receipt, Settings, Heart, BarChart3, ShieldCheck, ChevronRight, AlertTriangle, Bot, Megaphone } from "lucide-react";
import { useTelegramUser, triggerHaptic } from "@/hooks/useTelegramUser";
import { useNotifications } from "@/hooks/useNotifications";
import { useAdmin } from "@/hooks/useAdmin";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

const menuItems = [
  { label: "Dashboard", desc: "Sales stats & analytics", icon: BarChart3, path: "/profile/dashboard" },
  { label: "My Listings", desc: "View and manage your posts", icon: List, path: "/profile/listings" },
  { label: "My Ads", desc: "Manage your sponsored ads", icon: Megaphone, path: "/profile/ads" },
  { label: "My Favorites", desc: "Listings you've saved", icon: Heart, path: "/favorites" },
  { label: "My Transactions", desc: "Your purchase & sales history", icon: Receipt, path: "/profile/transactions" },
  { label: "Settings", desc: "Account preferences", icon: Settings, path: "/profile/settings" },
];

const AppHeader = () => {
  const { user, isGuest } = useTelegramUser();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { unreadCount } = useNotifications();
  const initials = isGuest ? "?" : user.first_name.charAt(0).toUpperCase();

  // Listen for bottom nav profile tab clicks
  useEffect(() => {
    const handler = () => setSheetOpen(true);
    window.addEventListener("open-profile-sheet", handler);
    return () => window.removeEventListener("open-profile-sheet", handler);
  }, []);

  const handleSearch = () => {
    if (query.trim()) {
      triggerHaptic("light");
      navigate(`/explore?q=${encodeURIComponent(query.trim())}`);
      setSearchOpen(false);
      setQuery("");
    }
  };

  const handleMenuClick = (path: string) => {
    triggerHaptic("light");
    setSheetOpen(false);
    navigate(path);
  };

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center">
        <div className="w-full max-w-[480px] bg-card/90 backdrop-blur-xl border-b border-border/50 shadow-sm">
          <div className="flex items-center justify-between px-5 py-3 pt-[calc(env(safe-area-inset-top)+12px)]">
            {/* Avatar — opens sidebar */}
            <button
              onClick={() => { triggerHaptic("light"); setSheetOpen(true); }}
              className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm overflow-hidden ${
                isGuest
                  ? "bg-destructive/20 border-2 border-destructive/40"
                  : "bg-gradient-to-br from-primary to-primary/60"
              }`}
            >
              {!isGuest && user.photo_url ? (
                <img src={user.photo_url} alt={user.first_name} className="w-full h-full object-cover" />
              ) : (
                <span className={`text-sm font-bold ${isGuest ? "text-destructive" : "text-primary-foreground"}`}>{initials}</span>
              )}
            </button>

            {/* Search + Notification */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => { triggerHaptic("light"); setSearchOpen(!searchOpen); }}
                className="w-9 h-9 rounded-full bg-card border border-border/50 flex items-center justify-center shadow-sm"
              >
                {searchOpen ? <X className="w-4 h-4 text-foreground" /> : <Search className="w-4 h-4 text-muted-foreground" />}
              </button>
              <button
                onClick={() => { triggerHaptic("light"); navigate("/notifications"); }}
                className="relative w-9 h-9 rounded-full bg-card border border-border/50 flex items-center justify-center shadow-sm"
              >
                <Bell className="w-4 h-4 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-primary flex items-center justify-center px-1">
                    <span className="text-[10px] font-bold text-primary-foreground">{unreadCount > 9 ? "9+" : unreadCount}</span>
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Expandable search bar */}
          <AnimatePresence>
            {searchOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden px-5 pb-3"
              >
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
                  className="flex items-center gap-2 bg-card rounded-2xl px-4 py-3 border border-border/50 shadow-sm"
                >
                  <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search listings..."
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                  <button type="submit" className="text-xs font-semibold text-primary">
                    Go
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Profile Sidebar Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="w-[300px] p-0 flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>Profile Menu</SheetTitle>
            <SheetDescription>Navigate your account</SheetDescription>
          </SheetHeader>

          {/* User info */}
          <div className="flex items-center gap-3 px-5 pt-8 pb-5 border-b border-border/50">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm overflow-hidden shrink-0 ${
              isGuest
                ? "bg-destructive/20 border-2 border-destructive/40"
                : "bg-gradient-to-br from-primary to-primary/60"
            }`}>
              {!isGuest && user.photo_url ? (
                <img src={user.photo_url} alt={user.first_name} className="w-full h-full object-cover" />
              ) : (
                <span className={`text-lg font-bold ${isGuest ? "text-destructive" : "text-primary-foreground"}`}>{initials}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground truncate">
                {isGuest ? "Guest" : `${user.first_name}`}
              </p>
              {!isGuest && user.username && (
                <p className="text-xs text-primary font-semibold truncate">@{user.username}</p>
              )}
            </div>
          </div>

          {/* Guest warning */}
          {isGuest && (
            <div className="mx-4 mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-foreground">Not connected to Telegram</p>
                <button
                  onClick={() => window.open("https://t.me/TrustPayMarketsBot", "_blank")}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-semibold"
                >
                  Open in Telegram
                </button>
              </div>
            </div>
          )}

          {/* Admin link */}
          {isAdmin && (
            <button
              onClick={() => handleMenuClick("/admin")}
              className="mx-4 mt-4 flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/30 text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-primary">Admin Panel</p>
                <p className="text-[10px] text-primary/70">Manage marketplace</p>
              </div>
              <ChevronRight className="w-4 h-4 text-primary shrink-0" />
            </button>
          )}

          {/* Menu items */}
          <div className="flex flex-col gap-1 px-4 mt-4 flex-1">
            {menuItems.map((mi) => {
              const Icon = mi.icon;
              return (
                <button
                  key={mi.label}
                  onClick={() => handleMenuClick(mi.path)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 active:bg-accent transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{mi.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{mi.desc}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>

          {/* Other bot link */}
          <div className="px-4 pb-5 mt-auto border-t border-border/50 pt-4">
            <button
              onClick={() => { triggerHaptic("light"); window.open("https://t.me/TrustPay9jaBot", "_blank"); }}
              className="flex items-center gap-3 p-3 rounded-xl bg-accent/50 hover:bg-accent transition-colors text-left w-full"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">TrustPay9ja Bot</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Open on Telegram</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default AppHeader;
