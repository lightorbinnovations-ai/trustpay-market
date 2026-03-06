import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Camera, Film, X, Loader2, Star } from "lucide-react";
import { triggerHaptic, useTelegramUser } from "@/hooks/useTelegramUser";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { compressImage, compressVideo } from "@/lib/media";
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
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [videoName, setVideoName] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  const [submitting, setSubmitting] = useState(false);

  const handleImageAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    const remaining = 5 - images.length;
    if (remaining <= 0) {
      toast({ title: "Max 5 images allowed", variant: "destructive" });
      return;
    }

    const toProcess = files.slice(0, remaining);

    for (const file of toProcess) {
      try {
        const compressed = await compressImage(file);
        setImages(prev => [...prev, compressed]);
        setPreviews(prev => [...prev, URL.createObjectURL(compressed)]);
      } catch (err) {
        toast({ title: "Failed to process image", variant: "destructive" });
      }
    }
  };

  const handleVideoAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressVideo(file);
      setVideo(compressed);
      setVideoName(compressed.name);
    } catch (err) {
      toast({ title: "Failed to process video", variant: "destructive" });
    }
  };

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (images.length === 0 && !video) {
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

      // Upload images
      const imagePaths: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const ext = file.name.split(".").pop();
        const path = `ads/${newAd.id}/image_${i}.${ext}`;
        const { error: upErr } = await supabase.storage.from("listing-images").upload(path, file);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("listing-images").getPublicUrl(path);
        imagePaths.push(urlData.publicUrl);
      }

      // Update ad with all image paths
      if (imagePaths.length > 0) {
        await supabase.functions.invoke('market-actions', {
          body: {
            action: 'edit_ad',
            payload: {
              id: newAd.id,
              image_paths: imagePaths,
              image_path: imagePaths[0] // Primary image for backward compatibility
            }
          },
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
          body: { action: 'edit_ad', payload: { id: newAd.id, video_path: urlData.publicUrl } },
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
          <label className="text-sm font-bold text-foreground mb-2 block">Ad Media (Up to 5 images + 1 video)</label>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {previews.map((src, i) => (
              <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-border/50 shrink-0">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive/80 flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-destructive-foreground" />
                </button>
              </div>
            ))}

            {images.length < 5 && (
              <button
                onClick={() => imageInputRef.current?.click()}
                className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground shrink-0"
              >
                <Camera className="w-5 h-5" />
                <span className="text-[10px] mt-1">Image</span>
              </button>
            )}

            {videoName ? (
              <div className="relative flex items-center shrink-0 h-24 gap-2 px-3 py-2 rounded-xl border border-border/50 bg-card">
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
                className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground shrink-0"
              >
                <Film className="w-5 h-5" />
                <span className="text-[10px] mt-1">Video</span>
              </button>
            )}
          </div>
          <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageAdd} />
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
