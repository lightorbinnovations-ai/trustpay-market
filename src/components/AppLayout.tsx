import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "./BottomNav";
import AppHeader from "./AppHeader";
import TelegramGate from "./TelegramGate";
import { useTelegramUser } from "@/hooks/useTelegramUser";

const AppLayout = () => {
  const { isGuest, isReady } = useTelegramUser();
  const location = useLocation();
  const isListingDetail = location.pathname.startsWith("/listing/");

  // Block access if not opened inside Telegram
  if (isReady && isGuest) {
    return <TelegramGate />;
  }

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-[480px] relative">
        {!isListingDetail && <AppHeader />}
        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={`pb-28 min-h-screen ${isListingDetail ? "pt-0" : "pt-[76px]"}`}
          >
            <Outlet />
          </motion.main>
        </AnimatePresence>
        <BottomNav />
      </div>
    </div>
  );
};

export default AppLayout;
