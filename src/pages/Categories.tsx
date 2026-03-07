import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Wrench, Zap, Sparkles, Truck, Settings, Smartphone,
  Shirt, UtensilsCrossed, Heart, MoreHorizontal,
} from "lucide-react";
import { triggerHaptic } from "@/hooks/useTelegramUser";
import { useActiveAds } from "@/hooks/useActiveAds";
import AdCard from "@/components/AdCard";
import { useLanguage } from "@/context/LanguageContext";

const Categories = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: ads } = useActiveAds("categories", 1);

  const categories = [
    { name: t("categories.names.plumbing") || "Plumbing", icon: Wrench, gradient: "from-sky-400 to-blue-500", key: "Plumbing" },
    { name: t("categories.names.electrical") || "Electrical", icon: Zap, gradient: "from-amber-400 to-orange-500", key: "Electrical" },
    { name: t("categories.names.cleaning") || "Cleaning", icon: Sparkles, gradient: "from-emerald-400 to-teal-500", key: "Cleaning" },
    { name: t("categories.names.delivery") || "Delivery", icon: Truck, gradient: "from-violet-400 to-purple-500", key: "Delivery" },
    { name: t("categories.names.repairs") || "Repairs", icon: Settings, gradient: "from-rose-400 to-pink-500", key: "Repairs" },
    { name: t("categories.names.gadgets") || "Gadgets", icon: Smartphone, gradient: "from-cyan-400 to-blue-500", key: "Gadgets" },
    { name: t("categories.names.fashion") || "Fashion", icon: Shirt, gradient: "from-fuchsia-400 to-pink-500", key: "Fashion" },
    { name: t("categories.names.food") || "Food & Beverages", icon: UtensilsCrossed, gradient: "from-orange-400 to-red-500", key: "Food & Beverages" },
    { name: t("categories.names.beauty") || "Beauty & Wellness", icon: Heart, gradient: "from-pink-400 to-rose-500", key: "Beauty & Wellness" },
    { name: t("categories.names.other") || "Other", icon: MoreHorizontal, gradient: "from-slate-400 to-gray-500", key: "Other" },
  ];

  return (
    <div className="px-5 pt-4">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-2xl font-extrabold text-foreground">{t("categories.title") || "Categories"}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("categories.subtitle") || "Find services or products by category"}</p>
      </motion.div>

      {/* Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-4 mt-8"
      >
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <motion.button
              key={cat.name}
              variants={card}
              whileTap={{ scale: 1.05 }}
              onClick={() => {
                triggerHaptic("light");
                navigate(`/category/${encodeURIComponent(cat.key)}`);
              }}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-card border border-border/50 shadow-sm active:shadow-md transition-shadow"
            >
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center shadow-lg`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold text-foreground text-center leading-tight">{cat.name}</span>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Sponsored Ad */}
      {ads && ads.length > 0 && (
        <div className="mt-6 grid grid-cols-2">
          <AdCard ad={ads[0]} />
        </div>
      )}
    </div>
  );
};

export default Categories;
