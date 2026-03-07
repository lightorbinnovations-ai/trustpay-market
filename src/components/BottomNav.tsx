import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Compass, PlusCircle, Grid3X3, User } from "lucide-react";
import { triggerHaptic } from "@/hooks/useTelegramUser";

import { useLanguage } from "@/context/LanguageContext";

const BottomNav = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { path: "/home", icon: Home, label: t("nav.home") },
    { path: "/explore", icon: Compass, label: t("nav.explore") },
    { path: "/post", icon: PlusCircle, label: t("nav.post") },
    { path: "/categories", icon: Grid3X3, label: t("nav.categories") || "Categories" },
    { path: "/profile", icon: User, label: t("nav.profile") },
  ];

  const handleTabClick = (tab: any) => {
    triggerHaptic("light");
    navigate(tab.path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-[env(safe-area-inset-bottom)]">
      <div className="mx-4 mb-3 w-full max-w-[440px] rounded-[1.25rem] bg-card/90 backdrop-blur-xl border border-border/50 shadow-[0_4px_24px_rgba(0,0,0,0.08)] px-1 py-2">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path || location.pathname.startsWith(tab.path + "/");
            const Icon = tab.icon;
            return (
              <button
                key={tab.path}
                onClick={() => handleTabClick(tab)}
                className="relative flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-colors"
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-accent rounded-xl"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  className={`relative z-10 w-5 h-5 transition-colors ${isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                />
                <span
                  className={`relative z-10 text-[10px] font-semibold transition-colors ${isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BottomNav;
