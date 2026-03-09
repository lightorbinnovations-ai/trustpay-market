import React, { useState, useMemo, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, SlidersHorizontal, Loader2, Heart, Navigation, Rocket, X, Clock } from "lucide-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/currency";
import { triggerHaptic } from "@/hooks/useTelegramUser";
import { useListingsThumbnails } from "@/hooks/useListingImages";
import ListingImage from "@/components/ListingImage";
import { useFavorites } from "@/hooks/useFavorites";
import { useUserLocation, haversineDistance } from "@/hooks/useUserLocation";
import { useVerifiedSellers } from "@/hooks/useVerifiedSeller";
import VerifiedBadge from "@/components/VerifiedBadge";
import { Slider } from "@/components/ui/slider";
import { useActiveAds, getAdForIndex } from "@/hooks/useActiveAds";
import AdCard from "@/components/AdCard";

import { useLanguage } from "@/context/LanguageContext";

const PAGE_SIZE = 20;
const RECENT_SEARCHES_KEY = "trustpay_recent_searches";
const MAX_RECENT = 6;

const getRecentSearches = (): string[] => {
  try { return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]"); }
  catch { return []; }
};

const saveRecentSearch = (q: string) => {
  if (!q.trim()) return;
  const existing = getRecentSearches().filter((s) => s !== q.trim());
  const updated = [q.trim(), ...existing].slice(0, MAX_RECENT);
  try { localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated)); } catch { /* no-op */ }
};

const clearRecentSearches = () => {
  try { localStorage.removeItem(RECENT_SEARCHES_KEY); } catch { /* no-op */ }
};

const categoryFilters = [
  "All", "Plumbing", "Electrical", "Cleaning", "Delivery", "Repairs",
  "Gadgets", "Fashion", "Food & Beverages", "Beauty & Wellness", "Other",
];

const sortOptions = [
  { label: "Newest", value: "newest" },
  { label: "Nearest", value: "nearest" },
  { label: "Price: Low", value: "price_asc" },
  { label: "Price: High", value: "price_desc" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const Explore = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQ = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQ);
  const [activeCategory, setActiveCategory] = useState("All");
  const [sort, setSort] = useState("newest");
  const [showSort, setShowSort] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const [recentSearches, setRecentSearches] = useState(getRecentSearches);
  const { isFavorite, toggleFavorite } = useFavorites();
  const { location } = useUserLocation();
  const [maxDistance, setMaxDistance] = useState(50);

  // Fetch weighted random ads
  const { data: activeAds } = useActiveAds("explore", 5);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["explore-listings-paged"],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("status", "active")
        .order("boosted_until", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);
      if (error) throw error;
      return { items: data, nextOffset: data.length === PAGE_SIZE ? pageParam + PAGE_SIZE : undefined };
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    initialPageParam: 0,
  });

  const allListings = data?.pages.flatMap((p) => p.items) || [];

  const filtered = useMemo(() => {
    let results = [...allListings];

    const userCountry = location?.country?.code;
    if (userCountry) {
      results = results.filter((l) => !l.country || l.country === userCountry);
    }

    if (activeCategory !== "All") {
      results = results.filter((l) => l.category === activeCategory);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      results = results.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.description?.toLowerCase().includes(q) ||
          l.category?.toLowerCase().includes(q) ||
          l.city?.toLowerCase().includes(q)
      );
    }

    const now = new Date();
    const userCity = location?.city?.toLowerCase();

    const withDistance = results.map((l) => {
      let dist: number | null = null;
      let isCityMatch = false;

      // 1. Precise Coordinate Distance
      if (location && l.latitude && l.longitude) {
        dist = haversineDistance(location.latitude, location.longitude, l.latitude, l.longitude);
      } 
      
      // 2. City String Fallback (if coords missing or extremely far)
      if (userCity && l.city) {
        const itemCity = l.city.toLowerCase();
        if (itemCity.includes(userCity) || userCity.includes(itemCity)) {
          isCityMatch = true;
          // If no distance, give it a "virtual" close distance (e.g. 5km)
          if (dist === null) dist = 5; 
        }
      }

      const isBoosted = l.boosted_until && new Date(l.boosted_until) > now;
      return { ...l, _dist: dist, _isBoosted: isBoosted, _isCityMatch: isCityMatch };
    });

    let final = location
      ? withDistance.filter((l) => l._dist === null || l._dist <= maxDistance || l._isCityMatch)
      : withDistance;

    // Multi-criteria Sort
    final.sort((a, b) => {
      // 1. Boosted Status (Always First)
      if (a._isBoosted !== b._isBoosted) {
        return a._isBoosted ? -1 : 1;
      }

      // 2. Exact City Match Priority (for listings without precise coords)
      if (location && a._isCityMatch !== b._isCityMatch) {
        return a._isCityMatch ? -1 : 1;
      }

      // 3. User Selected Sort Selection
      if (sort === "nearest" && location) {
        const distA = a._dist ?? 999999;
        const distB = b._dist ?? 999999;
        if (distA !== distB) return distA - distB;
      } else if (sort === "price_asc") {
        if ((a.price || 0) !== (b.price || 0)) return (a.price || 0) - (b.price || 0);
      } else if (sort === "price_desc") {
        if ((a.price || 0) !== (b.price || 0)) return (b.price || 0) - (a.price || 0);
      }

      // 4. Fallback: Distance (Proximity preference even in 'newest' sort)
      if (location && sort !== "nearest") {
         const distA = a._dist ?? 999999;
         const distB = b._dist ?? 999999;
         // If one is significantly closer (> 10km diff), prefer closer
         if (Math.abs(distA - distB) > 10) return distA - distB;
      }

      // 5. Final: Date (Newest)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return final;
  }, [allListings, activeCategory, query, sort, location, maxDistance]);

  const filteredIds = filtered.map((l) => l.id);
  const { data: thumbs } = useListingsThumbnails(filteredIds);

  // Batch check verified sellers
  const sellerIds = useMemo(() => {
    const ids = filtered.map((l) => l.seller_telegram_id);
    return [...new Set(ids)];
  }, [filtered]);
  const { data: verifiedSet } = useVerifiedSellers(sellerIds);

  // Infinite scroll observer
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  const now = new Date();

  return (
    <div className="px-5 pt-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-extrabold text-foreground">{t("explore.header")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("explore.search")}</p>
      </motion.div>

      {/* Search bar */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-card rounded-2xl px-4 py-3 border border-border/50 shadow-sm">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setShowRecent(true)}
              onBlur={() => setTimeout(() => setShowRecent(false), 200)}
              onKeyDown={(e) => { if (e.key === "Enter" && query.trim()) { saveRecentSearch(query); setRecentSearches(getRecentSearches()); setShowRecent(false); } }}
              placeholder={t("explore.search")}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            {query && (
              <button onClick={() => { setQuery(""); triggerHaptic("light"); }}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <button
            onClick={() => { triggerHaptic("light"); setShowSort(!showSort); }}
            className={`w-11 h-11 rounded-2xl border flex items-center justify-center shadow-sm transition-colors ${showSort ? "bg-primary border-primary" : "bg-card border-border/50"
              }`}
          >
            <SlidersHorizontal className={`w-4 h-4 ${showSort ? "text-primary-foreground" : "text-muted-foreground"}`} />
          </button>
        </div>

        {/* Recent searches dropdown */}
        <AnimatePresence>
          {showRecent && !query && recentSearches.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="mt-2 rounded-2xl bg-card border border-border/50 shadow-sm overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-2 border-b border-border/20">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Recent</span>
                <button onClick={() => { clearRecentSearches(); setRecentSearches([]); }} className="text-[10px] text-primary font-semibold">Clear</button>
              </div>
              {recentSearches.map((s) => (
                <button
                  key={s}
                  onMouseDown={() => { setQuery(s); setShowRecent(false); triggerHaptic("light"); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-accent/50 transition-colors border-b border-border/10 last:border-b-0"
                >
                  {s}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Sort options & Location Indicator */}
      {showSort && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 overflow-hidden space-y-3">
          <div className="flex gap-2 flex-wrap">
            {sortOptions.map((s) => (
              <button
                key={s.value}
                onClick={() => { triggerHaptic("light"); setSort(s.value); }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${sort === s.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border/50"
                  }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          
          <div className="flex flex-col gap-2">
            {location && (
              <div className="flex items-center gap-3 bg-card rounded-2xl px-4 py-3 border border-border/50">
                <Navigation className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs text-muted-foreground">Within {maxDistance} km</p>
                    {location.city && (
                      <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10">
                        📍 {location.city} detected
                      </span>
                    )}
                  </div>
                  <Slider value={[maxDistance]} onValueChange={(v) => setMaxDistance(v[0])} min={1} max={200} step={1} />
                </div>
              </div>
            )}
            {!location && (
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-3 flex items-center gap-3">
                <MapPin className="w-4 h-4 text-amber-500" />
                <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                  Enable location for better results. Sorting by newest first.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none mt-4 -mx-5 px-5 pb-1">
        {categoryFilters.map((cat) => (
          <button
            key={cat}
            onClick={() => { triggerHaptic("light"); setActiveCategory(cat); }}
            className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors ${activeCategory === cat
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-foreground border-border/50"
              }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results count */}
      {!isLoading && (query.trim() || activeCategory !== "All") && (
        <p className="text-xs text-muted-foreground mt-3">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""} found
          {query.trim() ? ` for "${query}"` : ""}
          {activeCategory !== "All" ? ` in ${activeCategory}` : ""}
        </p>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="w-20 h-20 rounded-3xl bg-accent flex items-center justify-center mb-5"
          >
            <span className="text-4xl">🔍</span>
          </motion.div>
          <h2 className="text-lg font-bold text-foreground">{t("explore.no_results")}</h2>
          <p className="text-muted-foreground text-sm mt-2 max-w-[240px]">
            {query.trim() ? `${t("explore.no_results")} "${query}".` : t("explore.no_results")}
          </p>
          {query.trim() && (
            <button
              onClick={() => { setQuery(""); triggerHaptic("light"); }}
              className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
            >
              Clear Search
            </button>
          )}
        </motion.div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {filtered.map((item, idx) => {
              const isBoosted = item.boosted_until && new Date(item.boosted_until) > now;
              const isVerified = verifiedSet?.has(item.seller_telegram_id);

              // Insert an ad card every 6 listings (weighted random)
              const adItem = getAdForIndex(idx, activeAds, 6);

              return (
                <React.Fragment key={item.id}>
                  {adItem && <AdCard ad={adItem} />}
                  <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    animate="show"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { triggerHaptic("light"); navigate(`/listing/${item.id}`); }}
                    className={`rounded-2xl overflow-hidden bg-card border shadow-sm cursor-pointer ${isBoosted ? "border-primary/40 ring-1 ring-primary/20" : "border-border/50"
                      }`}
                  >
                    <div className="relative h-28 overflow-hidden">
                      <ListingImage src={thumbs?.[item.id]} alt={item.title} className="w-full h-full" />
                      {isBoosted && (
                        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/90 backdrop-blur-sm">
                          <Rocket className="w-2.5 h-2.5 text-primary-foreground" />
                          <span className="text-[9px] font-bold text-primary-foreground">PROMOTED</span>
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic("medium");
                          toggleFavorite.mutate(item.id);
                        }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-card/70 backdrop-blur-sm flex items-center justify-center"
                      >
                        <Heart className={`w-3.5 h-3.5 transition-colors ${isFavorite(item.id) ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                      </button>
                    </div>
                    <div className="p-3">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
                        {isVerified && <VerifiedBadge size="sm" />}
                      </div>
                      <p className="text-primary font-bold text-sm mt-1">{formatPrice(item.price || 0, item.country)}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {item.city && (
                          <span className="flex items-center gap-0.5 text-muted-foreground text-[10px]">
                            <MapPin className="w-2.5 h-2.5" /> {item.city}
                          </span>
                        )}
                        {item._dist !== null && (
                          <span className="text-[10px] text-primary font-medium ml-auto">
                            {item._dist < 1 ? `${Math.round(item._dist * 1000)}m` : `${item._dist.toFixed(1)}km`}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </React.Fragment>
              );
            })}
          </div>
          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="flex justify-center py-6">
            {isFetchingNextPage && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
          </div>
        </>
      )}
    </div>
  );
};

export default Explore;
