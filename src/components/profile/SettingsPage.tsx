import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Bell, Shield, HelpCircle, ChevronRight, ChevronDown, Check, BadgeCheck, Star, Loader2 } from "lucide-react";
import { triggerHaptic, useTelegramUser } from "@/hooks/useTelegramUser";
import { Switch } from "@/components/ui/switch";
import { useVerifiedSeller } from "@/hooks/useVerifiedSeller";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { translations, Language } from "@/lib/translations";
import { Phone, Mail, Send } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const PREFS_KEY = "trustpay_settings";

interface NotifPrefs {
  listing_views: boolean;
  favorites: boolean;
  transactions: boolean;
  nearby: boolean;
}

interface Settings {
  language: string;
  notifications: NotifPrefs;
}

const defaultSettings: Settings = {
  language: "en",
  notifications: { listing_views: true, favorites: true, transactions: true, nearby: true },
};

const languages = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
];

const faqItems = [
  { q: "How does TrustPay Escrow work?", a: "When you buy, your payment is held securely in escrow. It's only released to the seller after you confirm delivery. This protects both buyers and sellers." },
  { q: "How do I boost my listing?", a: "Go to Profile → My Listings → Tap 'Boost' on any active listing. Choose a duration and pay with Telegram Stars ⭐. Boosted listings appear at the top of search results." },
  { q: "How do I contact a seller?", a: "Open any listing and tap 'Chat on Telegram' to message the seller directly. You can also use TrustPay Escrow for secure payments." },
  { q: "Is my payment safe?", a: "Yes! TrustPay uses escrow protection. Your money is held securely and only released when you confirm delivery." },
  { q: "How do I post a listing?", a: "Tap the '+' Post button at the bottom, choose Service or Product, fill in the details, and submit. You can add up to 3 photos." },
  { q: "What is the Verified Badge?", a: "Pay 90 Stars (~₦3,330) to get a ✅ badge next to your name for 30 days. It builds trust with buyers." },
];

const SettingsPage = () => {
  const { user } = useTelegramUser();
  const { data: verifiedData, isLoading: verifiedLoading } = useVerifiedSeller(user.id);
  const isVerified = !!verifiedData;
  const [expanded, setExpanded] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PREFS_KEY);
      if (saved) setSettings(JSON.parse(saved));
    } catch { /* use defaults */ }
  }, []);

  const save = (updated: Settings) => {
    setSettings(updated);
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(updated)); } catch { /* no-op */ }
  };

  const toggleNotif = (key: keyof NotifPrefs) => {
    triggerHaptic("light");
    const updated = { ...settings, notifications: { ...settings.notifications, [key]: !settings.notifications[key] } };
    save(updated);
  };

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("verify-seller", {
        body: { telegram_id: user.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      triggerHaptic("heavy");
      toast({ title: "⭐ Invoice sent to Telegram!", description: "Open Telegram to pay with Stars." });
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  const setLanguage = (code: string) => {
    triggerHaptic("light");
    save({ ...settings, language: code });
    setExpanded(null);
  };

  const t = (translations[settings.language as Language] || translations.en).settings;
  const currentLang = languages.find((l) => l.code === settings.language) || languages[0];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-3">
      {/* Language */}
      <motion.div variants={fadeUp}>
        <button
          onClick={() => { triggerHaptic("light"); setExpanded(expanded === "language" ? null : "language"); }}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50 shadow-sm text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">{t.language}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{currentLang.flag} {currentLang.label}</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expanded === "language" ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {expanded === "language" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 rounded-2xl bg-card border border-border/50 overflow-hidden">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors border-b border-border/20 last:border-b-0"
                  >
                    <span className="text-base">{lang.flag}</span>
                    <span className="text-sm text-foreground flex-1">{lang.label}</span>
                    {settings.language === lang.code && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Notifications */}
      <motion.div variants={fadeUp}>
        <button
          onClick={() => { triggerHaptic("light"); setExpanded(expanded === "notifications" ? null : "notifications"); }}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50 shadow-sm text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">{t.notifications.header}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t.notifications.desc}</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expanded === "notifications" ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {expanded === "notifications" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 rounded-2xl bg-card border border-border/50 p-4 flex flex-col gap-4">
                {([
                  { key: "listing_views" as const, label: t.notifications.listing_views, desc: t.notifications.listing_views_desc },
                  { key: "favorites" as const, label: t.notifications.favorites, desc: t.notifications.favorites_desc },
                  { key: "transactions" as const, label: t.notifications.transactions, desc: t.notifications.transactions_desc },
                  { key: "nearby" as const, label: t.notifications.nearby, desc: t.notifications.nearby_desc },
                ]).map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch checked={settings.notifications[item.key]} onCheckedChange={() => toggleNotif(item.key)} />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>


      {/* Verified Badge */}
      <motion.div variants={fadeUp}>
        <div className="p-4 rounded-2xl bg-card border border-border/50 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <BadgeCheck className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">{t.verified.header}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isVerified
                  ? `${t.verified.active_until} ${new Date(verifiedData!.expires_at).toLocaleDateString()}`
                  : t.verified.desc}
              </p>
            </div>
          </div>
          {isVerified ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10">
              <BadgeCheck className="w-4 h-4 text-primary fill-primary/20" />
              <span className="text-xs font-semibold text-primary">{t.verified.success}</span>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => { triggerHaptic("medium"); verifyMutation.mutate(); }}
              disabled={verifyMutation.isPending || verifiedLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
            >
              {verifyMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Star className="w-4 h-4 fill-primary-foreground" /> {t.verified.get_verified}
                </>
              )}
            </motion.button>
          )}

        </div>
      </motion.div>

      {/* Privacy */}
      <motion.div variants={fadeUp}>
        <button
          onClick={() => { triggerHaptic("light"); setExpanded(expanded === "privacy" ? null : "privacy"); }}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50 shadow-sm text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">{t.privacy.header}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t.privacy.desc}</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expanded === "privacy" ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {expanded === "privacy" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 rounded-2xl bg-card border border-border/50 p-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.privacy.escrow}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.privacy.escrow_desc}</p>
                  </div>
                </div>
                <div className="h-px bg-border/50" />
                <div className="flex items-start gap-3">
                  <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.privacy.telegram}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.privacy.telegram_desc}</p>
                  </div>
                </div>
                <div className="h-px bg-border/50" />
                <div className="flex items-start gap-3">
                  <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.privacy.data}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.privacy.data_desc}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Help & FAQ */}
      <motion.div variants={fadeUp}>
        <button
          onClick={() => { triggerHaptic("light"); setExpanded(expanded === "help" ? null : "help"); }}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50 shadow-sm text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">{t.help.header}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t.help.desc}</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expanded === "help" ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {expanded === "help" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 rounded-2xl bg-card border border-border/50 overflow-hidden">
                {faqItems.map((faq, i) => (
                  <div key={i} className="border-b border-border/20 last:border-b-0">
                    <button
                      onClick={() => { triggerHaptic("light"); setFaqOpen(faqOpen === i ? null : i); }}
                      className="w-full flex items-center justify-between px-4 py-3 text-left"
                    >
                      <span className="text-sm font-semibold text-foreground pr-4">{faq.q}</span>
                      <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${faqOpen === i ? "rotate-90" : ""}`} />
                    </button>
                    <AnimatePresence>
                      {faqOpen === i && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <p className="px-4 pb-3 text-xs text-muted-foreground leading-relaxed">{faq.a}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
                <div className="p-4 bg-accent/30 space-y-4">
                  <p className="text-xs text-muted-foreground">{t.help.need_help}</p>

                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={() => { triggerHaptic("light"); window.open("https://t.me/lightorbinnovations", "_blank"); }}
                      className="flex items-center gap-3 w-full p-3 rounded-xl bg-card border border-border/50 hover:bg-accent/50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Send className="w-4 h-4 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-foreground">Telegram</p>
                        <p className="text-[10px] text-muted-foreground">@lightorbinnovations</p>
                      </div>
                    </button>

                    <button
                      onClick={() => { triggerHaptic("light"); window.open("tel:+2348025100844", "_blank"); }}
                      className="flex items-center gap-3 w-full p-3 rounded-xl bg-card border border-border/50 hover:bg-accent/50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Phone className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-foreground">Phone</p>
                        <p className="text-[10px] text-muted-foreground">+234 802 510 0844</p>
                      </div>
                    </button>

                    <button
                      onClick={() => { triggerHaptic("light"); window.open("mailto:lightorbinnovations@gmail.com", "_blank"); }}
                      className="flex items-center gap-3 w-full p-3 rounded-xl bg-card border border-border/50 hover:bg-accent/50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Mail className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-foreground">Email</p>
                        <p className="text-[10px] text-muted-foreground">lightorbinnovations@gmail.com</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>


      {/* App Info */}
      <motion.div variants={fadeUp} className="mt-4 text-center">
        <p className="text-xs text-muted-foreground">TrustPay Markets v1.0</p>
        <p className="text-[10px] text-muted-foreground mt-1">Built with ❤️ for Telegram</p>
        <p className="text-[10px] text-muted-foreground/50 mt-2">
          Powered by <span className="text-muted-foreground/70 font-semibold">LightOrb Innovations</span>
        </p>
      </motion.div>
    </motion.div>
  );
};

export default SettingsPage;
