import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { MapPin, Loader2, Heart, Rocket } from "lucide-react";
import { formatPrice } from "@/lib/currency";
import { triggerHaptic } from "@/hooks/useTelegramUser";
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useListingsThumbnails } from "@/hooks/useListingImages";
import ListingImage from "@/components/ListingImage";
import { useFavorites } from "@/hooks/useFavorites";
import { useActiveAds, getAdForIndex } from "@/hooks/useActiveAds";
import AdCard from "@/components/AdCard";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";

const PAGE_SIZE = 20;

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const CategoryDetail = () => {
  const { t } = useLanguage();
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const decoded = decodeURIComponent(name || "");
  const { isFavorite, toggleFavorite } = useFavorites();
  const { data: categoryAds } = useActiveAds("category", 5);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["category-listings", decoded],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("category", decoded)
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

  const listings = data?.pages.flatMap((p) => p.items) || [];
  const ids = listings.map((l) => l.id);
  const { data: thumbs } = useListingsThumbnails(ids);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) fetchNextPage();
      });
      if (node) observerRef.current.observe(node);
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  const now = new Date();

  const getTranslatedCategory = (key: string) => {
    // Find the key in categories names
    const entry = Object.entries(translations.en.categories.names).find(([k, v]) => v === key);
    return entry ? t(`categories.names.${entry[0]}`) : key;
  };

  return (
    <div className="px-5 pt-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-2xl font-extrabold text-foreground">{getTranslatedCategory(decoded)}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isLoading ? (t("categories.loading") || "Loading...") : `${listings.length} ${t("categories.results_found") || "found"}`}
        </p>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : listings.length > 0 ? (
        <>
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 mt-6">
            {listings.map((item, idx) => {
              const isBoosted = item.boosted_until && new Date(item.boosted_until) > now;
              const adItem = getAdForIndex(idx, categoryAds, 6);
              return (
                <React.Fragment key={item.id}>
                  {adItem && <AdCard ad={adItem} />}
                  <motion.div
                    variants={fadeUp}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { triggerHaptic("light"); navigate(`/listing/${item.id}`); }}
                    className={`rounded-2xl bg-card border shadow-sm overflow-hidden cursor-pointer active:shadow-md transition-shadow ${isBoosted ? "border-primary/40 ring-1 ring-primary/20" : "border-border/50"
                      }`}
                  >
                    <div className="relative h-28 overflow-hidden">
                      <ListingImage src={thumbs?.[item.id]} alt={item.title} className="w-full h-full" />
                      {isBoosted && (
                        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/90 backdrop-blur-sm">
                          <Rocket className="w-2.5 h-2.5 text-primary-foreground" />
                          <span className="text-[9px] font-bold text-primary-foreground">{t("categories.promoted") || "PROMOTED"}</span>
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
                      <p className="text-sm font-bold text-foreground truncate">{item.title}</p>
                      <p className="text-primary font-bold text-base mt-1">
                        {formatPrice(item.price || 0, item.country)}
                      </p>
                      {item.city && (
                        <span className="flex items-center gap-1 text-muted-foreground text-[10px] mt-1">
                          <MapPin className="w-3 h-3" /> {item.city}
                        </span>
                      )}
                    </div>
                  </motion.div>
                </React.Fragment>
              );
            })}
          </motion.div>
          <div ref={sentinelRef} className="flex justify-center py-6">
            {isFetchingNextPage && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
          </div>
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-5">
            <span className="text-3xl">📭</span>
          </div>
          <h2 className="text-lg font-bold text-foreground">{t("categories.no_listings") || "No listings yet"}</h2>
          <p className="text-muted-foreground text-sm mt-2 max-w-[240px]">
            {t("categories.be_first") || "Be the first to post in"} <span className="font-semibold text-foreground">{getTranslatedCategory(decoded)}</span>!
          </p>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { triggerHaptic("medium"); navigate("/post"); }}
            className="mt-5 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25"
          >
            {t("categories.create_listing") || "Create Listing"}
          </motion.button>
        </motion.div>
      )
      }
    </div>
  );
};

export default CategoryDetail;
