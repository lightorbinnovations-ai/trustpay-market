import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Heart, Loader2 } from "lucide-react";
import { useFavoriteListings, useFavorites } from "@/hooks/useFavorites";
import { useListingsThumbnails } from "@/hooks/useListingImages";
import ListingImage from "@/components/ListingImage";
import { formatPrice } from "@/lib/currency";
import { triggerHaptic } from "@/hooks/useTelegramUser";
import { useActiveAds } from "@/hooks/useActiveAds";
import AdCard from "@/components/AdCard";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const Favorites = () => {
  const navigate = useNavigate();
  const { data: listings, isLoading } = useFavoriteListings();
  const { isFavorite, toggleFavorite } = useFavorites();
  const ids = listings?.map((l) => l.id) || [];
  const { data: thumbs } = useListingsThumbnails(ids);
  const { data: favAds } = useActiveAds("favorites", 1);

  return (
    <div className="px-5 pt-4 pb-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-xl font-extrabold text-foreground">My Favorites</h1>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : !listings?.length ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-5">
            <span className="text-3xl">💝</span>
          </div>
          <h2 className="text-lg font-bold text-foreground">No favorites yet</h2>
          <p className="text-muted-foreground text-sm mt-2">Tap the heart icon on listings to save them here</p>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/explore")}
            className="mt-5 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25"
          >
            Browse Listings
          </motion.button>
        </motion.div>
      ) : (
        <>
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 gap-3">
            {listings.map((item) => (
              <motion.div
                key={item.id}
                variants={fadeUp}
                className="rounded-2xl overflow-hidden bg-card border border-border/50 shadow-sm"
              >
                <div
                  className="relative h-28 overflow-hidden cursor-pointer"
                  onClick={() => { triggerHaptic("light"); navigate(`/listing/${item.id}`); }}
                >
                  <ListingImage src={thumbs?.[item.id]} alt={item.title} className="w-full h-full" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic("medium");
                      toggleFavorite.mutate(item.id);
                    }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-card/70 backdrop-blur-sm flex items-center justify-center"
                  >
                    <Heart
                      className={`w-4 h-4 transition-colors ${
                        isFavorite(item.id) ? "fill-destructive text-destructive" : "text-muted-foreground"
                      }`}
                    />
                  </button>
                </div>
                <div
                  className="p-3 cursor-pointer"
                  onClick={() => { triggerHaptic("light"); navigate(`/listing/${item.id}`); }}
                >
                  <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
                  <p className="text-primary font-bold text-sm mt-1">{formatPrice(item.price || 0, item.country)}</p>
                  {item.city && (
                    <span className="flex items-center gap-0.5 text-muted-foreground text-[10px] mt-1">
                      <MapPin className="w-2.5 h-2.5" /> {item.city}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Single ad at bottom of favorites */}
          {favAds && favAds.length > 0 && (
            <div className="grid grid-cols-2 mt-4">
              <AdCard ad={favAds[0]} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Favorites;
