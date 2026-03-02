import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, ChevronLeft, ChevronRight, X, ExternalLink, User, ShieldCheck } from "lucide-react";
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
    owner_telegram_id: number;
    title: string;
    description?: string | null;
    image_path?: string | null;
    video_path?: string | null;
    link_url?: string | null;
    image_paths?: string[] | null;
  };
}

interface Advertiser {
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  photo_url?: string | null;
}

const AdCard = ({ ad }: AdCardProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [advertiser, setAdvertiser] = useState<Advertiser | null>(null);
  const [loadingAdvertiser, setLoadingAdvertiser] = useState(false);
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

  const fetchAdvertiser = async () => {
    if (advertiser || loadingAdvertiser) return;
    setLoadingAdvertiser(true);
    try {
      const { data, error } = await supabase
        .from('bot_users')
        .select('username, first_name, last_name, photo_url')
        .eq('telegram_id', ad.owner_telegram_id)
        .single();

      if (!error && data) {
        setAdvertiser(data);
      }
    } catch (err) {
      console.error("Error fetching advertiser:", err);
    } finally {
      setLoadingAdvertiser(false);
    }
  };

  const handleCardClick = () => {
    triggerHaptic("medium");
    setIsModalOpen(true);
    fetchAdvertiser();

    const initData = window.Telegram?.WebApp?.initData;
    supabase.functions.invoke('market-actions', {
      body: { action: 'track_ad_click', payload: { id: ad.id } },
      headers: initData ? { 'x-telegram-init-data': initData } : {}
    }).catch(console.error);
  };

  const handleVisitLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic("light");
    if (ad.link_url) {
      window.open(ad.link_url, "_blank");
    }
  };

  const images = ad.image_paths && ad.image_paths.length > 0
    ? ad.image_paths
    : ad.image_path ? [ad.image_path] : [];

  return (
    <>
      <motion.div
        key={`ad-${ad.id}`}
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="col-span-2 relative p-[2px] rounded-2xl overflow-hidden cursor-pointer group"
        onClick={handleCardClick}
      >
        {/* Animated Gradient Border */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_200%] animate-gradient opacity-80 group-hover:opacity-100 transition-opacity" />

        <div className="relative rounded-[14px] overflow-hidden bg-card border border-transparent shadow-sm h-full flex flex-col">
          <div className="relative h-36">
            {images.length > 1 ? (
              <div className="overflow-hidden h-full" ref={emblaRef}>
                <div className="flex h-full">
                  {images.map((src, i) => (
                    <div key={i} className="flex-[0_0_100%] min-w-0 h-full">
                      <img src={src} alt={`${ad.title}-${i}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            ) : images.length === 1 ? (
              <img src={images[0]} alt={ad.title} className="w-full h-full object-cover" />
            ) : ad.video_path ? (
              <video src={ad.video_path} className="w-full h-full object-cover" muted autoPlay loop playsInline />
            ) : null}

            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/90 backdrop-blur-sm shadow-sm">
              <Megaphone className="w-2.5 h-2.5 text-accent-foreground" />
              <span className="text-[9px] font-bold text-accent-foreground">AD</span>
            </div>
          </div>
          <div className="p-3 bg-card flex-1">
            <p className="text-sm font-bold text-foreground truncate">{ad.title}</p>
            {ad.description && (
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{ad.description}</p>
            )}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-black/40 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Ad Image/Carousel */}
              <div className="relative w-full aspect-video bg-muted">
                {images.length > 0 ? (
                  <img src={images[0]} alt={ad.title} className="w-full h-full object-cover" />
                ) : ad.video_path ? (
                  <video src={ad.video_path} className="w-full h-full object-cover" controls autoPlay loop playsInline />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Megaphone className="w-12 h-12 text-muted-foreground/20" />
                  </div>
                )}
              </div>

              <div className="p-6 space-y-6 overflow-y-auto">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-accent text-[10px] font-bold text-accent-foreground tracking-wider">SPONSORED</span>
                    <h2 className="text-xl font-bold text-foreground">{ad.title}</h2>
                  </div>
                  {ad.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {ad.description}
                    </p>
                  )}
                </div>

                <div className="h-px bg-border/50" />

                {/* Advertiser Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden border border-accent/30">
                      {advertiser?.photo_url ? (
                        <img src={advertiser.photo_url} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-accent-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Advertiser</p>
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-bold text-foreground">
                          {advertiser?.first_name || advertiser?.username || "Verified Partner"}
                        </p>
                        <ShieldCheck className="w-3.5 h-3.5 text-primary fill-primary/10" />
                      </div>
                    </div>
                  </div>

                  {advertiser?.username && (
                    <a
                      href={`https://t.me/${advertiser.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-primary px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                    >
                      @{advertiser.username}
                    </a>
                  )}
                </div>

                {/* Action Button */}
                <button
                  onClick={handleVisitLink}
                  className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
                >
                  <ExternalLink className="w-5 h-5" />
                  Visit Link / Open App
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </>
  );
};

export default AdCard;
