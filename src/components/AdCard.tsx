import { motion } from "framer-motion";
import { Megaphone } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

interface AdCardProps {
  ad: {
    id: string;
    title: string;
    description?: string | null;
    image_path?: string | null;
    video_path?: string | null;
    link_url?: string | null;
  };
}

const AdCard = ({ ad }: AdCardProps) => (
  <motion.div
    key={`ad-${ad.id}`}
    variants={fadeUp}
    initial="hidden"
    animate="show"
    className="col-span-2 rounded-2xl overflow-hidden bg-card border border-accent shadow-sm cursor-pointer"
    onClick={() => ad.link_url ? window.open(ad.link_url, "_blank") : null}
  >
    <div className="relative">
      {ad.image_path && (
        <img src={ad.image_path} alt={ad.title} className="w-full h-36 object-cover" />
      )}
      {ad.video_path && !ad.image_path && (
        <video src={ad.video_path} className="w-full h-36 object-cover" muted autoPlay loop playsInline />
      )}
      <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/90 backdrop-blur-sm">
        <Megaphone className="w-2.5 h-2.5 text-accent-foreground" />
        <span className="text-[9px] font-bold text-accent-foreground">AD</span>
      </div>
    </div>
    <div className="p-3">
      <p className="text-sm font-bold text-foreground">{ad.title}</p>
      {ad.description && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ad.description}</p>
      )}
    </div>
  </motion.div>
);

export default AdCard;
