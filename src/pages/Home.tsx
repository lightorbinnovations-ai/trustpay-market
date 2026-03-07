import { useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, MapPin, Loader2, Heart, Navigation } from "lucide-react";
import { useTelegramUser, triggerHaptic } from "@/hooks/useTelegramUser";
import { formatPrice } from "@/lib/currency";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useListingsThumbnails } from "@/hooks/useListingImages";
import ListingImage from "@/components/ListingImage";
import { useFavorites } from "@/hooks/useFavorites";
import { useUserLocation, haversineDistance } from "@/hooks/useUserLocation";
import { useVerifiedSellers } from "@/hooks/useVerifiedSeller";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useActiveAds } from "@/hooks/useActiveAds";
import AdCard from "@/components/AdCard";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

import { useLanguage } from "@/context/LanguageContext";

const Home = () => {
  const { user, isGuest } = useTelegramUser();
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { location: userLocation } = useUserLocation();
  const { data: homeAds } = useActiveAds("home", 5);
  const featuredScrollRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  const { data: featuredListings, isLoading: featuredLoading } = useQuery({
    queryKey: ["featured-listings", userLocation?.country?.code],
    queryFn: async () => {
      let query = supabase
        .from("listings")
        .select("*")
        .eq("status", "active")
        .not("boosted_until", "is", null)
        .gte("boosted_until", new Date().toISOString());

      if (userLocation?.country?.code) {
        query = query.eq("country", userLocation.country.code);
      }

      const { data: boosted, error: boostedErr } = await query
        .order("boosted_until", { ascending: false })
        .limit(6);
      if (boostedErr) throw boostedErr;

      if (boosted && boosted.length > 0) return boosted;

      let recentQuery = supabase
        .from("listings")
        .select("*")
        .eq("status", "active");

      if (userLocation?.country?.code) {
        recentQuery = recentQuery.eq("country", userLocation.country.code);
      }

      const { data: recent, error: recentErr } = await recentQuery
        .order("created_at", { ascending: false })
        .limit(6);
      if (recentErr) throw recentErr;
      return recent;
    },
  });

  // Shuffle featured on every page load
  const shuffledFeatured = useMemo(() => {
    if (!featuredListings) return [];
    return [...featuredListings].sort(() => Math.random() - 0.5);
  }, [featuredListings]);

  // Auto-scroll featured every 3 seconds
  useEffect(() => {
    const el = featuredScrollRef.current;
    if (!el || !shuffledFeatured.length) return;
    const CARD_WIDTH = 216; // 200px card + 16px gap
    let current = 0;
    const timer = setInterval(() => {
      current = (current + 1) % shuffledFeatured.length;
      el.scrollTo({ left: current * CARD_WIDTH, behavior: "smooth" });
    }, 3000);
    return () => clearInterval(timer);
  }, [shuffledFeatured]);

  const { data: recentListings, isLoading: recentLoading } = useQuery({
    queryKey: ["recent-listings", userLocation?.country?.code],
    queryFn: async () => {
      let query = supabase
        .from("listings")
        .select("*")
        .eq("status", "active");

      if (userLocation?.country?.code) {
        query = query.eq("country", userLocation.country.code);
      }

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const nearbyListings = useMemo(() => {
    if (!recentListings) return [];
    if (!userLocation) return recentListings.slice(0, 8);

    return [...recentListings]
      .map((listing) => {
        const dist =
          listing.latitude && listing.longitude
            ? haversineDistance(userLocation.latitude, userLocation.longitude, listing.latitude, listing.longitude)
            : Infinity;
        return { ...listing, distance: dist };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 8);
  }, [recentListings, userLocation]);

  const allIds = [
    ...(featuredListings?.map((l) => l.id) || []),
    ...(nearbyListings?.map((l) => l.id) || []),
  ];
  const uniqueIds = [...new Set(allIds)];
  const { data: thumbs } = useListingsThumbnails(uniqueIds);

  // Batch check verified sellers
  const allSellerIds = useMemo(() => {
    const ids = [
      ...(featuredListings?.map((l) => l.seller_telegram_id) || []),
      ...(nearbyListings?.map((l) => l.seller_telegram_id) || []),
    ];
    return [...new Set(ids)];
  }, [featuredListings, nearbyListings]);
  const { data: verifiedSet } = useVerifiedSellers(allSellerIds);

  const gradients = [
    "from-blue-400 to-cyan-300",
    "from-violet-400 to-purple-300",
    "from-emerald-400 to-teal-300",
    "from-amber-400 to-orange-300",
    "from-rose-400 to-pink-300",
    "from-cyan-400 to-blue-300",
  ];

  return (
    <div className="px-5 pt-4">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-2xl font-extrabold text-foreground">
          {t("home.hi")}, {user.first_name} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isGuest ? t("home.guest_link") : `@${user.username || user.first_name} · ${t("home.what_need")}`}
        </p>
      </motion.div>

      {/* Search Bar (links to explore) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="mt-5"
      >
        <button
          onClick={() => navigate("/explore")}
          className="w-full flex items-center gap-3 bg-card rounded-2xl px-4 py-3.5 shadow-sm border border-border/50 text-left"
        >
          <span className="text-muted-foreground text-sm">{t("home.search_placeholder")}</span>
        </button>
      </motion.div>

      {/* Featured Listings */}
      <motion.section variants={stagger} initial="hidden" animate="show" className="mt-8">
        <motion.div variants={fadeUp} className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">{t("home.featured")}</h2>
          <button
            onClick={() => navigate("/explore")}
            className="text-xs font-semibold text-primary flex items-center gap-0.5"
          >
            {t("home.see_all")} <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>

        {featuredLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : (
          <div ref={featuredScrollRef} className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none -mx-5 px-5">
            {shuffledFeatured.map((item, idx) => {
              const isVerified = verifiedSet?.has(item.seller_telegram_id);
              return (
                <motion.div
                  key={item.id}
                  variants={fadeUp}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { triggerHaptic("light"); navigate(`/listing/${item.id}`); }}
                  className="snap-start shrink-0 w-[200px] rounded-2xl overflow-hidden cursor-pointer"
                >
                  <div className="h-32 rounded-t-2xl overflow-hidden">
                    {thumbs?.[item.id] ? (
                      <ListingImage src={thumbs[item.id]} alt={item.title} className="w-full h-full" />
                    ) : (
                      <div className={`h-full bg-gradient-to-br ${gradients[idx % gradients.length]} flex items-end p-4`}>
                        <div className="bg-card/20 backdrop-blur-sm rounded-lg px-2 py-1">
                          <span className="text-[10px] font-semibold text-primary-foreground">{item.category || "General"}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="bg-card p-3 border border-border/50 border-t-0 rounded-b-2xl">
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                      {isVerified && <VerifiedBadge size="sm" />}
                    </div>
                    <p className="text-primary font-bold text-base mt-1">{formatPrice(item.price || 0, item.country)}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.section>

      {/* Sponsored Ads — show up to 2 between sections */}
      {homeAds && homeAds.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          {homeAds.slice(0, 2).map((ad, i) => (
            <AdCard key={ad.id ?? i} ad={ad} />
          ))}
        </div>
      )}

      {/* Nearby / Recent Listings */}
      <motion.section variants={stagger} initial="hidden" animate="show" className="mt-8">
        <motion.div variants={fadeUp} className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">
              {userLocation ? t("home.near_you") : t("home.recent")}
            </h2>
            {userLocation && (
              <span className="flex items-center gap-0.5 text-[10px] font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <Navigation className="w-2.5 h-2.5" /> {t("home.live")}
              </span>
            )}
          </div>
          <button
            onClick={() => navigate("/explore")}
            className="text-xs font-semibold text-primary flex items-center gap-0.5"
          >
            {t("home.see_all")} <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>

        {recentLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : !nearbyListings?.length ? (
          <p className="text-sm text-muted-foreground py-4">{t("home.no_listings")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {nearbyListings.map((item: any) => {
              const isVerified = verifiedSet?.has(item.seller_telegram_id);
              return (
                <motion.div
                  key={item.id}
                  variants={fadeUp}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { triggerHaptic("light"); navigate(`/listing/${item.id}`); }}
                  className="flex gap-4 bg-card rounded-2xl p-4 border border-border/50 shadow-sm cursor-pointer"
                >
                  <div className="w-20 h-20 rounded-xl bg-secondary shrink-0 overflow-hidden">
                    <ListingImage src={thumbs?.[item.id]} alt={item.title} className="w-full h-full" />
                  </div>
                  <div className="flex flex-col justify-center min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-bold text-foreground truncate">{item.title}</p>
                      {isVerified && <VerifiedBadge size="sm" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description || "No description"}</p>
                    <div className="flex items-center mt-1.5">
                      <span className="text-primary font-bold text-sm">{formatPrice(item.price || 0, item.country)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {item.distance !== Infinity && item.distance !== undefined && (
                        <span className="text-[10px] font-medium text-emerald-500">
                          {item.distance < 1 ? `${Math.round(item.distance * 1000)}m` : `${Math.round(item.distance)}km`}
                        </span>
                      )}
                      {item.city && (
                        <span className="flex items-center gap-1 text-muted-foreground text-[10px] truncate">
                          <MapPin className="w-3 h-3 shrink-0" /> {item.city}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.section>

      {/* Second ad slot after listings */}
      {homeAds && homeAds.length > 2 && (
        <div className="mt-6 flex flex-col gap-3">
          {homeAds.slice(2, 4).map((ad, i) => (
            <AdCard key={ad.id ?? i} ad={ad} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
