import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Loader2, Trash2, Pause, Play, Star, ExternalLink, Plus, Edit2, Eye, MousePointer2, BarChart3 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTelegramUser, triggerHaptic } from "@/hooks/useTelegramUser";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
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

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const MyAds = () => {
  const { user } = useTelegramUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const { data: ads, isLoading } = useQuery({
    queryKey: ["my-ads", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ads")
        .select("*")
        .eq("owner_telegram_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: user.id !== 0,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ads").delete().eq("id", id).eq("owner_telegram_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-ads"] });
      triggerHaptic("heavy");
      toast({ title: "Ad deleted 🗑️" });
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
    },
  });

  const togglePause = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === "paused" ? "active" : "paused";
      const { error } = await supabase.from("ads").update({ status: newStatus }).eq("id", id).eq("owner_telegram_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-ads"] });
      triggerHaptic("medium");
      toast({ title: "Ad status updated ✅" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!ads || ads.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-5">
          <span className="text-3xl">📢</span>
        </div>
        <h2 className="text-lg font-bold text-foreground">No ads yet</h2>
        <p className="text-muted-foreground text-sm mt-2">Create your first ad to promote on the marketplace!</p>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => { triggerHaptic("medium"); navigate("/create-ad"); }}
          className="mt-5 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25"
        >
          Create Ad
        </motion.button>
      </motion.div>
    );
  }

  const now = new Date();

  return (
    <>
      <div className="flex justify-end mb-4">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => { triggerHaptic("light"); navigate("/create-ad"); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
        >
          <Plus className="w-3.5 h-3.5" /> New Ad
        </motion.button>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-3">
        {ads.map((ad) => {
          const isActive = ad.status === "active" && ad.expires_at && new Date(ad.expires_at) > now;
          const isExpired = ad.expires_at && new Date(ad.expires_at) <= now;
          const statusLabel = isExpired ? "Expired" : ad.status === "paused" ? "Paused" : ad.status === "active" ? "Active" : "Pending";
          const statusColor = isActive ? "text-primary bg-primary/10" : ad.status === "paused" ? "text-muted-foreground bg-muted" : isExpired ? "text-destructive bg-destructive/10" : "text-muted-foreground bg-accent";

          return (
            <motion.div
              key={ad.id}
              variants={fadeUp}
              className="bg-card rounded-2xl p-4 border border-border/50 shadow-sm"
            >
              <div className="flex gap-3">
                {(ad.video_path || ad.image_path || (ad.image_paths && ad.image_paths.length > 0)) && (
                  <div className="w-16 h-16 rounded-xl bg-secondary shrink-0 overflow-hidden relative">
                    {ad.video_path ? (
                      <video src={ad.video_path} className="w-full h-full object-cover" muted />
                    ) : (
                      <img 
                        src={ad.image_path || ad.image_paths?.[0]} 
                        alt={ad.title} 
                        className="w-full h-full object-cover" 
                      />
                    )}
                    {(ad.image_paths?.length > 1 || (ad.image_path && ad.video_path)) && (
                      <div className="absolute bottom-1 right-1 px-1 rounded bg-black/40 text-[8px] text-white">
                        +{ad.image_paths?.length || 1}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{ad.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>{statusLabel}</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5" /> {ad.stars_paid} Stars
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{ad.duration_days} day{ad.duration_days > 1 ? "s" : ""}</p>

                  {/* Analytics */}
                  <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/10">
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] font-bold text-foreground">{ad.views_count || 0}</span>
                      <span className="text-[8px] text-muted-foreground uppercase">Views</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MousePointer2 className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] font-bold text-foreground">{ad.clicks_count || 0}</span>
                      <span className="text-[8px] text-muted-foreground uppercase">Clicks</span>
                    </div>
                    {ad.views_count > 0 && (
                      <div className="flex items-center gap-1 ml-auto">
                        <BarChart3 className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-bold text-primary">
                          {((ad.clicks_count || 0) / ad.views_count * 100).toFixed(1)}%
                        </span>
                        <span className="text-[8px] text-primary/70 uppercase">CTR</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
                {(ad.status === "active" || ad.status === "paused") && !isExpired && (
                  <button
                    onClick={() => { triggerHaptic("light"); togglePause.mutate({ id: ad.id, currentStatus: ad.status }); }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-accent text-accent-foreground text-xs font-semibold"
                  >
                    {ad.status === "paused" ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                    {ad.status === "paused" ? "Resume" : "Pause"}
                  </button>
                )}
                {ad.link_url && (
                  <button
                    onClick={() => window.open(ad.link_url!, "_blank")}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-accent text-accent-foreground text-xs font-semibold"
                  >
                    <ExternalLink className="w-3 h-3" /> Link
                  </button>
                )}
                <button
                  onClick={() => { triggerHaptic("light"); navigate(`/edit-ad/${ad.id}`); }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-accent text-accent-foreground text-xs font-semibold"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
                <button
                  onClick={() => { triggerHaptic("light"); setDeleteTarget({ id: ad.id, title: ad.title }); }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold ml-auto"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[320px] mx-auto rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ad</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.title}"? This cannot be undone.
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

export default MyAds;
