import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Megaphone, ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { supabase } from "@/integrations/supabase/client";
import { triggerHaptic } from "@/hooks/useTelegramUser";

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
    image_paths?: string[] | null;
  };
}

const AdCard = ({ ad }: AdCardProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const viewTracked = useRef(false);

  useEffect(() => {
    // Track view once per mount
    if (!viewTracked.current) {
      viewTracked.current = true;
      const initData = window.Telegram?.WebApp?.initData;
      supabase.functions.invoke('market-actions', {
        body: { action: 'track_ad_view', payload: { id: ad.id } },
        headers: initData ? { 'x-telegram-init-data': initData } : {}
      }).catch(console.error);
    }
  }, [ad.id]);

  const handleClick = () => {
    triggerHaptic("light");
    const initData = window.Telegram?.WebApp?.initData;
    supabase.functions.invoke('market-actions', {
      body: { action: 'track_ad_click', payload: { id: ad.id } },
      headers: initData ? { 'x-telegram-init-data': initData } : {}
    }).catch(console.error);

    if (ad.link_url) {
      window.open(ad.link_url, "_blank");
    }
  };

  const images = ad.image_paths && ad.image_paths.length > 0
    ? ad.image_paths
    : ad.image_path ? [ad.image_path] : [];

  return (
    <motion.div
      key={`ad-${ad.id}`}
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className="col-span-2 rounded-2xl overflow-hidden bg-card border border-accent shadow-sm cursor-pointer"
      onClick={handleClick}
    >
      <div className="relative">
        {images.length > 1 ? (
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {images.map((src, i) => (
                <div key={i} className="flex-[0_0_100%] min-w-0">
                  <img src={src} alt={`${ad.title}-${i}`} className="w-full h-36 object-cover" />
                </div>
              ))}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); emblaApi?.scrollPrev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); emblaApi?.scrollNext(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </div>
        ) : images.length === 1 ? (
          <img src={images[0]} alt={ad.title} className="w-full h-36 object-cover" />
        ) : ad.video_path ? (
          <video src={ad.video_path} className="w-full h-36 object-cover" muted autoPlay loop playsInline />
        ) : null}

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
};

export default AdCard;
