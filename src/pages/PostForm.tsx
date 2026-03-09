import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Camera, X, Loader2, MapPin, Navigation } from "lucide-react";
import { triggerHaptic, useTelegramUser } from "@/hooks/useTelegramUser";
import { compressImage } from "@/lib/media";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useUserLocation } from "@/hooks/useUserLocation";

const categoryOptions = [
  "Plumbing", "Electrical", "Cleaning", "Delivery", "Repairs",
  "Gadgets", "Fashion", "Food & Beverages", "Beauty & Wellness", "Other",
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
};

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const PostForm = () => {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { user } = useTelegramUser();
  const label = type === "service" ? "Service" : "Product";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { location: userLocation } = useUserLocation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rawPrice, setRawPrice] = useState("");
  const [displayPrice, setDisplayPrice] = useState("");

  const handlePriceChange = (val: string) => {
    const digits = val.replace(/[^0-9]/g, "");
    setRawPrice(digits);
    setDisplayPrice(digits ? Number(digits).toLocaleString("en-NG") : "");
  };
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleImageAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    const remainingSlots = Math.max(0, 3 - images.length);
    if (remainingSlots === 0) {
      toast({ title: "You can only add up to 3 images", variant: "destructive" });
      return;
    }

    const selected = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      toast({ title: `Only the first ${remainingSlots} image${remainingSlots > 1 ? "s were" : " was"} added` });
    }

    const supported = selected.filter((file) => SUPPORTED_IMAGE_TYPES.has(file.type));
    const unsupportedCount = selected.length - supported.length;
    if (unsupportedCount > 0) {
      toast({
        title: "Some images were skipped",
        description: "Only JPG, PNG, and WebP are supported.",
        variant: "destructive",
      });
    }

    if (!supported.length) return;

    const settled = await Promise.allSettled(
      supported.map(async (file) => {
        let processed = file;
        try {
          processed = await compressImage(file);
        } catch {
          // Keep original file if compression fails; do not block preview.
        }
        return {
          file: processed,
          preview: URL.createObjectURL(processed),
        };
      })
    );

    const successes = settled
      .filter((result): result is PromiseFulfilledResult<{ file: File; preview: string }> => result.status === "fulfilled")
      .map((result) => result.value);

    if (!successes.length) {
      toast({ title: "Could not load selected image(s)", variant: "destructive" });
      return;
    }

    setImages((prev) => [...prev, ...successes.map((s) => s.file)]);
    setPreviews((prev) => [...prev, ...successes.map((s) => s.preview)]);
  };

  const removeImage = (idx: number) => {
    setPreviews((p) => {
      const target = p[idx];
      if (target?.startsWith("blob:")) URL.revokeObjectURL(target);
      return p.filter((_, i) => i !== idx);
    });
    setImages((p) => p.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !category) {
      toast({ title: "Title and category are required", variant: "destructive" });
      return;
    }
    if (user.id === 0) {
      toast({ title: "Open inside Telegram to post", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const initData = window.Telegram?.WebApp?.initData;
      if (!initData) throw new Error("Telegram authentication missing");

      // Insert listing first to get the ID
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        price: rawPrice ? parseFloat(rawPrice) : null,
        category,
        city: city.trim() || null,
        type: type === "service" ? "service" : "item",
        latitude: userLocation?.latitude || null,
        longitude: userLocation?.longitude || null,
        country: userLocation?.country?.code || null,
      };

      if (!userLocation && !city.trim()) {
         toast({ 
           title: "Location missing", 
           description: "Please enter a city or allow location access to help buyers find you.",
           variant: "destructive" 
         });
         setSubmitting(false);
         return;
      }

      const { data, error } = await supabase.functions.invoke('market-actions', {
        body: {
          action: 'create_listing',
          payload
        },
        headers: {
          'x-telegram-init-data': initData
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const newListing = data?.listing;
      if (!newListing) throw new Error("Failed to receive listing data");

      // Upload images under listings/{listingId}/
      for (const file of images) {
        const ext = file.name.split(".").pop();
        const path = `listings/${newListing.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("listing-images")
          .upload(path, file);
        if (uploadErr) throw uploadErr;
      }

      triggerHaptic("heavy");
      toast({ title: "Listing posted! 🎉" });

      // Notify users in the same city (fire-and-forget)
      if (city.trim()) {
        import("@/hooks/useNotifications").then(({ notifyNewListingInCity }) => {
          notifyNewListingInCity(
            newListing.id,
            title.trim(),
            city.trim(),
            user.id,
            user.first_name
          );
        });
      }

      navigate("/home");
    } catch (err: any) {
      toast({ title: "Failed to post", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-5 pt-4 pb-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-2xl font-extrabold text-foreground">Post a {label}</h1>
        <p className="text-muted-foreground text-sm mt-1">Fill in the details below</p>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-4 mt-6">
        {/* Images */}
        <motion.div variants={fadeUp}>
          <label className="text-sm font-bold text-foreground mb-2 block">Photos (max 3)</label>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {previews.map((src, i) => (
              <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-border/50">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive/80 flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-destructive-foreground" />
                </button>
              </div>
            ))}
            {images.length < 3 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center shrink-0 text-muted-foreground"
              >
                <Camera className="w-5 h-5" />
                <span className="text-[10px] mt-1">Add</span>
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageAdd} />
          <p className="text-xs text-muted-foreground mt-2">You can only add up to 3 images maximum (first 3 will be used).</p>
        </motion.div>

        {/* Title */}
        <motion.div variants={fadeUp}>
          <label className="text-sm font-bold text-foreground mb-2 block">Title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={type === "service" ? "e.g. Professional Cleaning" : "e.g. iPhone 15 Pro Max"}
            className="w-full px-4 py-3.5 rounded-2xl bg-card border border-border/50 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring shadow-sm"
          />
        </motion.div>

        {/* Description */}
        <motion.div variants={fadeUp}>
          <label className="text-sm font-bold text-foreground mb-2 block">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your listing..."
            rows={4}
            className="w-full px-4 py-3.5 rounded-2xl bg-card border border-border/50 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring shadow-sm resize-none"
          />
        </motion.div>

        {/* Price */}
        <motion.div variants={fadeUp}>
          <label className="text-sm font-bold text-foreground mb-2 block">Price ({userLocation?.country?.symbol || "₦"})</label>
          <input
            value={displayPrice}
            onChange={(e) => handlePriceChange(e.target.value)}
            placeholder="0"
            inputMode="numeric"
            className="w-full px-4 py-3.5 rounded-2xl bg-card border border-border/50 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring shadow-sm"
          />
        </motion.div>

        {/* Category */}
        <motion.div variants={fadeUp}>
          <label className="text-sm font-bold text-foreground mb-2 block">Category *</label>
          <div className="flex flex-wrap gap-2">
            {categoryOptions.map((c) => (
              <button
                key={c}
                onClick={() => { triggerHaptic("light"); setCategory(c); }}
                className={`px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors ${category === c
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-foreground border-border/50"
                  }`}
              >
                {c}
              </button>
            ))}
          </div>
        </motion.div>

        {/* City */}
        <motion.div variants={fadeUp}>
          <label className="text-sm font-bold text-foreground mb-2 block">City / Location</label>
          <div className="relative">
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Downtown, Midtown"
              className="w-full px-4 py-3.5 rounded-2xl bg-card border border-border/50 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring shadow-sm"
            />
            {userLocation ? (
              <div className="flex items-center gap-1.5 mt-2 px-1 text-[10px] text-primary font-bold">
                <Navigation className="w-3 h-3 fill-primary/10" />
                <span>GPS coordinates captured (High accuracy)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mt-2 px-1 text-[10px] text-amber-500 font-bold">
                <MapPin className="w-3 h-3" />
                <span>Enter city manually (GPS unavailable)</span>
              </div>
            )}
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
            {submitting ? "Posting..." : `Post ${label}`}
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default PostForm;
