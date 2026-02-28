import { forwardRef } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Send } from "lucide-react";

/**
 * Full-screen blocker shown when the app is NOT opened inside Telegram.
 */
const TelegramGate = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <div ref={ref} className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background px-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center text-center max-w-sm"
      >
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
          <ShieldAlert className="w-10 h-10 text-destructive" />
        </div>

        <h1 className="text-2xl font-extrabold text-foreground mb-3">
          Telegram Required
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-8">
          TrustPay Markets can only be accessed through the Telegram app. Please
          open the link below in Telegram to continue.
        </p>

        <a
          href="https://t.me/TrustPayMarketsBot"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-base shadow-lg shadow-primary/25 active:scale-[0.98] transition-transform"
        >
          <Send className="w-5 h-5" />
          Open in Telegram
        </a>

        <p className="text-muted-foreground/60 text-xs mt-6">
          Your identity is verified through Telegram for secure trading.
        </p>
      </motion.div>
      <p className="absolute bottom-6 text-muted-foreground/50 text-[11px] font-medium tracking-wide">
        Powered by <span className="text-muted-foreground/70 font-semibold">LightOrb Innovations</span>
      </p>
    </div>
  );
});

TelegramGate.displayName = "TelegramGate";

export default TelegramGate;
