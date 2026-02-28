import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTelegramUser } from "@/hooks/useTelegramUser";
import TelegramGate from "@/components/TelegramGate";

const Splash = () => {
  const navigate = useNavigate();
  const { isFirstTime, markVisited, isGuest, isReady } = useTelegramUser();
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (!isReady) return; // wait until detection finishes

    if (isGuest) return; // will show TelegramGate

    const timer = setTimeout(() => {
      if (isFirstTime) {
        setShowWelcome(true);
      } else {
        navigate("/home", { replace: true });
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [isReady, isGuest, isFirstTime, navigate]);

  // Show gate if detection is done and user is guest
  if (isReady && isGuest) {
    return <TelegramGate />;
  }

  // Show loading while detecting
  if (!isReady) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-card z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center"
        >
          <div className="w-20 h-20 rounded-[1.5rem] bg-primary flex items-center justify-center mb-6 shadow-lg shadow-primary/25">
            <span className="text-primary-foreground text-3xl font-extrabold">T</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            TrustPay Markets
          </h1>
          <motion.div
            className="mt-6 flex gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-primary/30"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
              />
            ))}
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-card z-50">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center"
      >
        <div className="w-20 h-20 rounded-[1.5rem] bg-primary flex items-center justify-center mb-6 shadow-lg shadow-primary/25">
          <span className="text-primary-foreground text-3xl font-extrabold">T</span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          TrustPay Markets
        </h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-3 text-muted-foreground text-base font-medium"
        >
          Buy. Sell. Securely.
        </motion.p>
      </motion.div>

      {/* Powered by */}
      <div className="absolute bottom-6 text-muted-foreground/50 text-[11px] font-medium tracking-wide">
        Powered by <span className="text-muted-foreground/70 font-semibold">LightOrb Innovations</span>
      </div>

      {/* Floating dots animation */}
      <motion.div
        className="absolute bottom-40 flex gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-primary/30"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
          />
        ))}
      </motion.div>

      {/* Welcome Panel */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 bg-card rounded-t-[2rem] p-8 pb-12 shadow-[0_-10px_40px_rgba(0,0,0,0.08)]"
          >
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-6" />
            <h2 className="text-xl font-bold text-foreground mb-2">
              Welcome to TrustPay Markets
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-8">
              The safest way to trade services and products on Telegram.
            </p>
            <button
              onClick={() => { markVisited(); navigate("/home", { replace: true }); }}
              className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-base shadow-lg shadow-primary/25 active:scale-[0.98] transition-transform"
            >
              Get Started
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Splash;
