import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { MapPin, Loader2, Trash2, Edit, Rocket, Star } from "lucide-react";
import { formatPrice } from "@/lib/currency";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTelegramUser, triggerHaptic } from "@/hooks/useTelegramUser";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { useListingsThumbnails } from "@/hooks/useListingImages";
import ListingImage from "@/components/ListingImage";
import { Slider } from "@/components/ui/slider";
import { calculateBoostStars } from "@/lib/boostPricing";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

// Removed old boostDayOptions — slider-based now

const statusOptions = [
  { value: "active", label: "Active", desc: "Visible to everyone" },
  { value: "sold", label: "Sold", desc: "Hidden, marked as sold" },
  { value: "private", label: "Private", desc: "Hidden from public" },
  { value: "paused", label: "Paused", desc: "Temporarily hidden" },
];

const MyListings = () => {
  const { user } = useTelegramUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [boostSelect, setBoostSelect] = useState<string | null>(null);
  const [boostDays, setBoostDays] = useState(7);

  const { data: listings, isLoading } = useQuery({
    queryKey: ["my-listings", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("seller_telegram_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: user.id !== 0,
  });

  const listingIds = listings?.map((l) => l.id) || [];
  const { data: thumbs } = useListingsThumbnails(listingIds);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("listings").delete().eq("id", id).eq("seller_telegram_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
      triggerHaptic("heavy");
      toast({ title: "Listing deleted 🗑️" });
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("listings").update({ status }).eq("id", id).eq("seller_telegram_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
      triggerHaptic("medium");
      toast({ title: "Status updated ✅" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update", description: err.message, variant: "destructive" });
    },
  });

  const boostMutation = useMutation({
    mutationFn: async ({ id, days }: { id: string; days: number }) => {
      const { data, error } = await supabase.functions.invoke("boost-listing", {
        body: { listing_id: id, telegram_id: user.id, days },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      triggerHaptic("heavy");
      toast({ title: "⭐ Invoice sent to your Telegram chat!", description: "Open Telegram to complete the payment." });
      setBoostSelect(null);
    },
    onError: (err: any) => {
      toast({ title: "Failed to send invoice", description: err.message, variant: "destructive" });
      setBoostSelect(null);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!listings || listings.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-5">
          <span className="text-3xl">📦</span>
        </div>
        <h2 className="text-lg font-bold text-foreground">No listings yet</h2>
        <p className="text-muted-foreground text-sm mt-2">Create your first listing to start selling!</p>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => { triggerHaptic("medium"); navigate("/post"); }}
          className="mt-5 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25"
        >
          Create Listing
        </motion.button>
      </motion.div>
    );
  }

  const now = new Date();

  return (
    <>
      <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-3">
        {listings.map((item) => {
          const isBoosted = item.boosted_until && new Date(item.boosted_until) > now;
          return (
            <motion.div
              key={item.id}
              variants={fadeUp}
              className={`bg-card rounded-2xl p-4 border shadow-sm ${
                isBoosted ? "border-primary/40 ring-1 ring-primary/20" : "border-border/50"
              }`}
            >
              <div
                className="flex gap-4 cursor-pointer"
                onClick={() => { triggerHaptic("light"); navigate(`/listing/${item.id}`); }}
              >
                <div className="w-16 h-16 rounded-xl bg-secondary shrink-0 overflow-hidden">
                  <ListingImage src={thumbs?.[item.id]} alt={item.title} className="w-full h-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{item.title}</p>
                  <p className="text-primary font-bold text-sm mt-0.5">{formatPrice(item.price || 0, item.country)}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    {isBoosted && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-0.5">
                        <Rocket className="w-2.5 h-2.5" /> Boosted
                      </span>
                    )}
                    {item.city && (
                      <span className="flex items-center gap-0.5 text-muted-foreground text-[10px]">
                        <MapPin className="w-2.5 h-2.5" /> {item.city}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status selector + actions */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
                <Select
                  value={item.status}
                  onValueChange={(value) => {
                    triggerHaptic("light");
                    statusMutation.mutate({ id: item.id, status: value });
                  }}
                >
                  <SelectTrigger className="h-8 w-[110px] text-[10px] font-semibold rounded-xl border-border/50 bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        <div>
                          <span className="font-semibold">{opt.label}</span>
                          <span className="text-muted-foreground ml-1">– {opt.desc}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <button
                  onClick={() => { triggerHaptic("light"); navigate(`/edit-listing/${item.id}`); }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-accent text-accent-foreground text-xs font-semibold"
                >
                  <Edit className="w-3 h-3" /> Edit
                </button>

                {item.status === "active" && !isBoosted && (
                  <button
                    onClick={() => { triggerHaptic("light"); setBoostSelect(boostSelect === item.id ? null : item.id); }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-semibold"
                  >
                    <Rocket className="w-3 h-3" /> Boost
                  </button>
                )}

                <button
                  onClick={() => { triggerHaptic("light"); setDeleteTarget({ id: item.id, title: item.title }); }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold ml-auto"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {/* Boost duration selector */}
              {boostSelect === item.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-3 pt-3 border-t border-border/30 overflow-hidden"
                >
                  <p className="text-xs text-muted-foreground mb-3">Slide to choose boost duration (pay with ⭐ Stars):</p>
                  <Slider
                    min={1}
                    max={30}
                    step={1}
                    value={[boostDays]}
                    onValueChange={([v]) => setBoostDays(v)}
                    className="mb-3"
                  />
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-foreground">
                      {boostDays} day{boostDays > 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1 text-sm font-bold text-primary">
                      <Star className="w-3.5 h-3.5 fill-primary" /> {calculateBoostStars(boostDays)} Stars
                    </span>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      triggerHaptic("medium");
                      boostMutation.mutate({ id: item.id, days: boostDays });
                    }}
                    disabled={boostMutation.isPending}
                    className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
                  >
                    {boostMutation.isPending ? "Sending invoice..." : `Boost for ${calculateBoostStars(boostDays)} ⭐`}
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[320px] mx-auto rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Listing</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MyListings;
