import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Briefcase, Package } from "lucide-react";
import { triggerHaptic } from "@/hooks/useTelegramUser";

const options = [
  {
    type: "service",
    label: "Post a Service",
    desc: "Offer your skills and expertise",
    icon: Briefcase,
    gradient: "from-blue-400 to-indigo-500",
  },
  {
    type: "product",
    label: "Post a Product",
    desc: "Sell items you no longer need",
    icon: Package,
    gradient: "from-emerald-400 to-teal-500",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const card = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: "easeOut" as const } },
};

const Post = () => {
  const navigate = useNavigate();

  return (
    <div className="px-5 pt-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-2xl font-extrabold text-foreground">Create a Listing</h1>
        <p className="text-muted-foreground text-sm mt-1">What would you like to post today?</p>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-4 mt-8">
        {options.map((opt) => {
          const Icon = opt.icon;
          return (
            <motion.button
              key={opt.type}
              variants={card}
              whileTap={{ scale: 1.03 }}
              onClick={() => {
                triggerHaptic("medium");
                navigate(`/post/${opt.type}`);
              }}
              className="flex items-center gap-5 p-6 rounded-2xl bg-card border border-border/50 shadow-sm active:shadow-md transition-shadow text-left"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${opt.gradient} flex items-center justify-center shadow-lg shrink-0`}>
                <Icon className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-base font-bold text-foreground">{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
              </div>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
};

export default Post;
