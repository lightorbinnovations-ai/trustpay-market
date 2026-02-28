import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Camera, Film, X, Loader2, Star } from "lucide-react";
import { triggerHaptic, useTelegramUser } from "@/hooks/useTelegramUser";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { compressImage } from "@/lib/compressImage";
import { calculateAdStars } from "@/lib/adPricing";
import { Slider } from "@/components/ui/slider";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
};

const CreateAd = () => {
  const navigate = useNavigate();
  const { user } = useTelegramUser();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [videoName, setVideoName] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  const [submitting, setSubmitting] = useState(false);

  const handleImageAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      setImage(compressed);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.onerror = () => toast({ title: "Could not load selected image", variant: "destructive" });
      reader.readAsDataURL(compressed);
    } catch {
      toast({ title: "Could not process selected image", variant: "destructive" });
    }
  };

  const handleVideoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Video must be under 10MB", variant: "destructive" });
      return;
    }
    setVideo(file);
    setVideoName(file.name);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (!image && !video) {
      toast({ title: "Add an image or video", variant: "destructive" });
      return;
    }
    if (user.id === 0) {
      toast({ title: "Open inside Telegram to create ads", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const initData = window.Telegram?.WebApp?.initData;
      if (!initData) throw new Error("Telegram authentication missing");

      // Insert ad record
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        target_url: linkUrl.trim() || null, // renamed from link_url to target_url in edge function payload
        duration_days: days,
        amount: stars, // Edge function uses "amount" for stars
      };

      const { data, error } = await supabase.functions.invoke('market-actions', {
        body: {
          action: 'create_ad',
          payload
        },
        headers: {
          'x-telegram-init-data': initData
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const newAd = data?.ad;
      if (!newAd) throw new Error("Failed to receive ad data");

      // Upload image
      if (image) {
        const ext = image.name.split(".").pop();
        const path = `ads/${newAd.id}/image.${ext}`;
        const { error: upErr } = await supabase.storage.from("listing-images").upload(path, image);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("listing-images").getPublicUrl(path);

        await supabase.functions.invoke('market-actions', {
          body: { action: 'update_ad_media', payload: { id: newAd.id, image_path: urlData.publicUrl } },
          headers: { 'x-telegram-init-data': initData }
        });
      }

      // Upload video
      if (video) {
        const ext = video.name.split(".").pop();
        const path = `ads/${newAd.id}/video.${ext}`;
        const { error: upErr } = await supabase.storage.from("listing-images").upload(path, video);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("listing-images").getPublicUrl(path);

        await supabase.functions.invoke('market-actions', {
          body: { action: 'update_ad_media', payload: { id: newAd.id, video_path: urlData.publicUrl } },
          headers: { 'x-telegram-init-data': initData }
        });
      }

      // Send payment invoice
      const { data: invoiceResult, error: invoiceErr } = await supabase.functions.invoke("pay-ad", {
        body: { ad_id: newAd.id, telegram_id: user.id, days },
      });
      if (invoiceErr) throw invoiceErr;
      if (invoiceResult?.error) throw new Error(invoiceResult.error);

      triggerHaptic("heavy");
      toast({ title: "Ad created! ⭐", description: "Check Telegram to pay with Stars." });
      navigate("/profile/ads");
    } catch (err: any) {
      toast({ title: "Failed to create ad", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const stars = calculateAdStars(days);

  return (
    <div className="px-5 pt-4 pb-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-2xl font-extrabold text-foreground">Create Ad</h1>
        <p className="text-muted-foreground text-sm mt-1">Promote your business on the marketplace</p>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-4 mt-6">
        {/* Image */}
        <motion.div variants={fadeUp}>
          <label className="text-sm font-bold text-foreground mb-2 block">Ad Image</label>
          <div className="flex gap-3">
            {imagePreview ? (
              <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-border/50">
                <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => { setImage(null); setImagePreview(null); }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive/80 flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-destructive-foreground" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => imageInputRef.current?.click()}
                className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground"
              >
                <Camera className="w-5 h-5" />
                <span className="text-[10px] mt-1">Image</span>
              </button>
            )}
            {/* Video */}
            {videoName ? (
              <div className="relative flex items-center gap-2 px-3 py-2 rounded-xl border border-border/50 bg-card">
                <Film className="w-4 h-4 text-primary" />
                <span className="text-xs text-foreground truncate max-w-[100px]">{videoName}</span>
                <button
                  onClick={() => { setVideo(null); setVideoName(null); }}
                  className="w-5 h-5 rounded-full bg-destructive/80 flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-destructive-foreground" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => videoInputRef.current?.click()}
                className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground"
              >
                <Film className="w-5 h-5" />
                <span className="text-[10px] mt-1">Video</span>
              </button>
            )}
          </div>
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageAdd} />
          <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoAdd} />
        </motion.div>

        {/* Title */}
        <motion.div variants={fadeUp}>
          <label className="text-sm font-bold text-foreground mb-2 block">Ad Title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Grand Opening Sale!"
            className="w-full px-4 py-3.5 rounded-2xl bg-card border border-border/50 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring shadow-sm"
          />
        </motion.div>

        {/* Description */}
        <motion.div variants={fadeUp}>
          <label className="text-sm font-bold text-foreground mb-2 block">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's your ad about?"
            rows={3}
            className="w-full px-4 py-3.5 rounded-2xl bg-card border border-border/50 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring shadow-sm resize-none"
          />
        </motion.div>

        {/* Link URL */}
        <motion.div variants={fadeUp}>
          <label className="text-sm font-bold text-foreground mb-2 block">Link (optional)</label>
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-4 py-3.5 rounded-2xl bg-card border border-border/50 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring shadow-sm"
          />
        </motion.div>

        {/* Duration slider */}
        <motion.div variants={fadeUp}>
          <label className="text-sm font-bold text-foreground mb-2 block">Duration</label>
          <div className="bg-card rounded-2xl px-4 py-4 border border-border/50 shadow-sm">
            <Slider min={1} max={30} step={1} value={[days]} onValueChange={([v]) => setDays(v)} className="mb-3" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">{days} day{days > 1 ? "s" : ""}</span>
              <span className="flex items-center gap-1 text-sm font-bold text-primary">
                <Star className="w-3.5 h-3.5 fill-primary" /> {stars} Stars
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">~{Math.round(stars / days)} Stars/day</p>
          </div>
        </motion.div>

        {/* Submit */}
        <motion.div variants={fadeUp} className="mt-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-base shadow-lg shadow-primary/25 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {submitting ? "Creating..." : `Create Ad for ${stars} ⭐`}
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default CreateAd;
