import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Tag, User, MessageCircle, Shield, Share2, Loader2, ChevronLeft, ChevronRight, Heart, X, ArrowLeft } from "lucide-react";
import { triggerHaptic, useTelegramUser } from "@/hooks/useTelegramUser";
import { formatPrice } from "@/lib/currency";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useListingImages } from "@/hooks/useListingImages";
import ListingImage from "@/components/ListingImage";
import { notifyListingView } from "@/hooks/useNotifications";
import { useFavorites } from "@/hooks/useFavorites";
import SellerReviews from "@/components/SellerReviews";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useVerifiedSeller } from "@/hooks/useVerifiedSeller";
import { useActiveAds } from "@/hooks/useActiveAds";
import AdCard from "@/components/AdCard";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const ListingDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useTelegramUser();
  const [activeImg, setActiveImg] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const { data: images } = useListingImages(id);
  const { isFavorite, toggleFavorite } = useFavorites();
  const { data: listingAds } = useActiveAds("listing-detail", 1);

  // Swipe gesture support
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchMove = (e: React.TouchEvent) => { touchEndX.current = e.touches[0].clientX; };
  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (images && images.length > 1 && Math.abs(diff) > 50) {
      if (diff > 0) setActiveImg((p) => (p + 1) % images.length);
      else setActiveImg((p) => (p - 1 + images.length) % images.length);
    }
  };

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: seller } = useQuery({
    queryKey: ["seller", listing?.seller_telegram_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bot_users")
        .select("*")
        .eq("telegram_id", listing!.seller_telegram_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!listing?.seller_telegram_id,
  });

  const { data: sellerVerified } = useVerifiedSeller(listing?.seller_telegram_id);

  // Keep active image index valid whenever the image list changes
  useEffect(() => {
    if (!images?.length) {
      setActiveImg(0);
      return;
    }
    if (activeImg >= images.length) {
      setActiveImg(0);
    }
  }, [images, activeImg]);

  // Notify seller of listing view
  const notifiedRef = useRef(false);
  useEffect(() => {
    if (listing && user.id !== 0 && !notifiedRef.current) {
      notifiedRef.current = true;
      notifyListingView(
        listing.id,
        listing.title,
        listing.seller_telegram_id,
        user.first_name,
        user.id
      );
    }
  }, [listing, user.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-5">
        <h2 className="text-lg font-bold text-foreground">Listing not found</h2>
        <p className="text-muted-foreground text-sm mt-2">This listing may have been removed.</p>
        <button onClick={() => navigate("/home")} className="mt-4 text-primary font-semibold text-sm">Go Home</button>
      </div>
    );
  }

  const isOwner = user.id !== 0 && user.id === listing.seller_telegram_id;

  return (
    <div className="pb-8">
      {/* Image Section - full bleed */}
      <motion.div
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" as const }}
        className="relative h-[380px] bg-secondary rounded-b-[2rem] overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {images && images.length > 0 ? (
          <>
            <div onClick={() => { triggerHaptic("light"); setModalOpen(true); }} className="w-full h-full cursor-pointer">
              <ListingImage key={activeImg} src={images[activeImg]} alt={listing.title} className="w-full h-full" />
            </div>
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveImg((p) => (p - 1 + images.length) % images.length); }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-card/70 backdrop-blur-sm flex items-center justify-center"
                >
                  <ChevronLeft className="w-4 h-4 text-foreground" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveImg((p) => (p + 1) % images.length); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-card/70 backdrop-blur-sm flex items-center justify-center"
                >
                  <ChevronRight className="w-4 h-4 text-foreground" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === activeImg ? "bg-primary" : "bg-card/50"}`} />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-muted-foreground text-sm font-medium">📷</span>
          </div>
        )}

        {/* Top action buttons */}
        <div className="absolute top-[calc(env(safe-area-inset-top)+12px)] left-4 right-4 flex justify-between">
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            onClick={() => { triggerHaptic("light"); navigate(-1); }}
            className="w-9 h-9 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </motion.button>
          <div className="flex gap-2">
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
              onClick={() => {
                triggerHaptic("medium");
                if (id) toggleFavorite.mutate(id);
              }}
              className="w-9 h-9 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center shadow-sm"
            >
              <Heart className={`w-4 h-4 transition-colors ${id && isFavorite(id) ? "fill-destructive text-destructive" : "text-foreground"}`} />
            </motion.button>
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              onClick={() => {
                triggerHaptic("light");
                const marketBot = import.meta.env.VITE_MARKET_BOT_USERNAME || "TrustPayMarketsBot";
                const shareLink = `https://t.me/${marketBot}?start=listing_${id}`;
                const shareText = `${listing.title} - ${formatPrice(listing.price || 0, listing.country)}`;
                const tg = (window as any).Telegram?.WebApp;
                if (tg?.openTelegramLink) {
                  tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(shareText)}`);
                } else {
                  navigator.clipboard?.writeText(shareLink);
                  import("sonner").then(({ toast }) => toast.success("Share link copied!"));
                }
              }}
              className="w-9 h-9 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center shadow-sm"
            >
              <Share2 className="w-4 h-4 text-foreground" />
            </motion.button>
          </div>
        </div>

        {/* Status badge */}
        {listing.status !== "active" && (
          <div className="absolute bottom-4 left-4 px-3 py-1 rounded-full bg-destructive/80 backdrop-blur-sm">
            <span className="text-xs font-semibold text-destructive-foreground capitalize">{listing.status}</span>
          </div>
        )}
      </motion.div>

      {/* Content */}
      <motion.div variants={container} initial="hidden" animate="show" className="px-5 mt-6">
        <motion.div variants={fadeUp}>
          <h1 className="text-xl font-extrabold text-foreground">{listing.title}</h1>
          <p className="text-2xl font-extrabold text-primary mt-1">{formatPrice(listing.price || 0, listing.country)}</p>
        </motion.div>

        {/* Tags */}
        <motion.div variants={fadeUp} className="flex flex-wrap gap-2 mt-4">
          {listing.category && (
            <span className="flex items-center gap-1 text-xs font-semibold bg-accent text-accent-foreground rounded-full px-3 py-1.5">
              <Tag className="w-3 h-3" /> {listing.category}
            </span>
          )}
          {listing.city && (
            <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-secondary rounded-full px-3 py-1.5">
              <MapPin className="w-3 h-3" /> {listing.city}
            </span>
          )}
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize ${listing.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
            listing.status === "sold" ? "bg-accent text-accent-foreground" :
              "bg-secondary text-muted-foreground"
            }`}>{listing.status}</span>
        </motion.div>

        <motion.div variants={fadeUp} className="h-px bg-border my-5" />

        {/* Seller */}
        <motion.div variants={fadeUp} className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border/50 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground flex items-center gap-1">
              {seller?.first_name || "Seller"}
              {sellerVerified && <VerifiedBadge size="md" />}
            </p>
            <p className="text-xs text-muted-foreground">{seller?.username ? `@${seller.username}` : "Seller"}</p>
          </div>
        </motion.div>

        {/* Description */}
        {listing.description && (
          <motion.div variants={fadeUp} className="mt-5">
            <h2 className="text-sm font-bold text-foreground mb-2">Description</h2>
            <div className="p-4 rounded-2xl bg-card border border-border/50 shadow-sm">
              <p className="text-sm text-muted-foreground leading-relaxed">{listing.description}</p>
            </div>
          </motion.div>
        )}

        {/* Seller Reviews */}
        {listing.seller_telegram_id && (
          <SellerReviews sellerTelegramId={listing.seller_telegram_id} />
        )}

        {/* Sponsored Ad */}
        {listingAds && listingAds.length > 0 && (
          <div className="mt-5 grid grid-cols-2">
            <AdCard ad={listingAds[0]} />
          </div>
        )}

        {/* Action Buttons */}
        <motion.div variants={fadeUp} className="flex flex-col gap-3 mt-6">
          {isOwner ? (
            <>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { triggerHaptic("medium"); navigate(`/edit-listing/${id}`); }}
                className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-base shadow-lg shadow-primary/25"
              >
                Edit Listing
              </motion.button>
            </>
          ) : (
            <>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  triggerHaptic("medium");
                  const username = seller?.username;
                  const tg = (window as any).Telegram?.WebApp;
                  if (username) {
                    const link = `https://t.me/${username}`;
                    if (tg?.openTelegramLink) tg.openTelegramLink(link);
                    else window.open(link, "_blank");
                  } else {
                    // Fallback: open by user ID
                    const link = `tg://user?id=${listing.seller_telegram_id}`;
                    if (tg?.openTelegramLink) tg.openTelegramLink(link);
                    else window.open(link, "_blank");
                  }
                }}
                className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-base shadow-lg shadow-primary/25"
              >
                <MessageCircle className="w-5 h-5" /> Chat on Telegram
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { triggerHaptic("medium"); navigate(`/checkout/${id}`); }}
                className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-card border-2 border-primary text-primary font-semibold text-base shadow-sm"
              >
                <Shield className="w-5 h-5" /> Use TrustPay Escrow
              </motion.button>
            </>
          )}
        </motion.div>
      </motion.div>

      {/* Full-screen image modal */}
      <AnimatePresence>
        {modalOpen && images && images.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
            onClick={() => setModalOpen(false)}
          >
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-[calc(env(safe-area-inset-top)+12px)] right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center z-10"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 text-xs font-medium z-10">
              {activeImg + 1} / {images.length}
            </div>

            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveImg((p) => (p - 1 + images.length) % images.length); }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center z-10"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveImg((p) => (p + 1) % images.length); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center z-10"
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
              </>
            )}

            <img
              src={images[activeImg]}
              alt={listing.title}
              className="max-w-full max-h-[85vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ListingDetails;
