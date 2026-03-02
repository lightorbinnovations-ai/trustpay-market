import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Camera, Film, X, Loader2, Save } from "lucide-react";
import { triggerHaptic, useTelegramUser } from "@/hooks/useTelegramUser";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { compressImage, compressVideo } from "@/lib/media";

const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
};

const EditAd = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useTelegramUser();
    const imageInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [linkUrl, setLinkUrl] = useState("");
    const [existingPaths, setExistingPaths] = useState<string[]>([]);
    const [newImages, setNewImages] = useState<File[]>([]);
    const [newPreviews, setNewPreviews] = useState<string[]>([]);
    const [video, setVideo] = useState<File | null>(null);
    const [existingVideo, setExistingVideo] = useState<string | null>(null);
    const [videoName, setVideoName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchAd = async () => {
            if (!id) return;
            const { data, error } = await supabase
                .from("ads")
                .select("*")
                .eq("id", id)
                .eq("owner_telegram_id", user.id)
                .single();

            if (error) {
                toast({ title: "Failed to load ad", variant: "destructive" });
                navigate("/profile/ads");
                return;
            }

            setTitle(data.title);
            setDescription(data.description || "");
            setLinkUrl(data.link_url || "");
            setExistingPaths(data.image_paths || (data.image_path ? [data.image_path] : []));
            setExistingVideo(data.video_path);
            setVideoName(data.video_path ? "Existing Video" : null);
            setLoading(false);
        };

        if (user.id !== 0) {
            fetchAd();
        }
    }, [id, user.id, navigate]);

    const handleImageAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        e.target.value = "";
        if (!files.length) return;

        const remaining = 5 - (existingPaths.length + newImages.length);
        if (remaining <= 0) {
            toast({ title: "Max 5 images allowed", variant: "destructive" });
            return;
        }

        const toProcess = files.slice(0, remaining);
        for (const file of toProcess) {
            try {
                const compressed = await compressImage(file);
                setNewImages(prev => [...prev, compressed]);
                setNewPreviews(prev => [...prev, URL.createObjectURL(compressed)]);
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
            setExistingVideo(null);
        } catch (err) {
            toast({ title: "Failed to process video", variant: "destructive" });
        }
    };

    const removeExisting = (idx: number) => {
        setExistingPaths(prev => prev.filter((_, i) => i !== idx));
    };

    const removeNew = (idx: number) => {
        setNewImages(prev => prev.filter((_, i) => i !== idx));
        setNewPreviews(prev => {
            URL.revokeObjectURL(prev[idx]);
            return prev.filter((_, i) => i !== idx);
        });
    };

    const handleUpdate = async () => {
        if (!title.trim()) {
            toast({ title: "Title is required", variant: "destructive" });
            return;
        }

        setSubmitting(true);
        try {
            const initData = window.Telegram?.WebApp?.initData;
            if (!initData) throw new Error("Telegram authentication missing");

            // Upload new images
            const imagePathsArr = [...existingPaths];
            for (let i = 0; i < newImages.length; i++) {
                const file = newImages[i];
                const ext = file.name.split(".").pop();
                const path = `ads/${id}/image_${Date.now()}_${i}.${ext}`;
                const { error: upErr } = await supabase.storage.from("listing-images").upload(path, file);
                if (upErr) throw upErr;
                const { data: urlData } = supabase.storage.from("listing-images").getPublicUrl(path);
                imagePathsArr.push(urlData.publicUrl);
            }

            // Update ad details + all image paths
            const { error: editErr } = await supabase.functions.invoke('market-actions', {
                body: {
                    action: 'edit_ad',
                    payload: {
                        id,
                        title: title.trim(),
                        description: description.trim() || null,
                        link_url: linkUrl.trim() || null,
                        image_paths: imagePathsArr,
                        image_path: imagePathsArr[0] || null
                    }
                },
                headers: {
                    'x-telegram-init-data': initData
                }
            });

            if (editErr) throw editErr;

            // Upload new video if changed
            if (video) {
                const ext = video.name.split(".").pop();
                const path = `ads/${id}/video_${Date.now()}.${ext}`;
                const { error: upErr } = await supabase.storage.from("listing-images").upload(path, video, { upsert: true });
                if (upErr) throw upErr;
                const { data: urlData } = supabase.storage.from("listing-images").getPublicUrl(path);

                await supabase.functions.invoke('market-actions', {
                    body: { action: 'edit_ad', payload: { id, video_path: urlData.publicUrl } },
                    headers: { 'x-telegram-init-data': initData }
                });
            } else if (!existingVideo && videoName === null) {
                // Video was removed
                await supabase.functions.invoke('market-actions', {
                    body: { action: 'edit_ad', payload: { id, video_path: null } },
                    headers: { 'x-telegram-init-data': initData }
                });
            }

            triggerHaptic("heavy");
            toast({ title: "Ad updated! ✅" });
            navigate("/profile/ads");
        } catch (err: any) {
            toast({ title: "Failed to update ad", description: err.message, variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="px-5 pt-4 pb-8">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <h1 className="text-2xl font-extrabold text-foreground">Edit Ad</h1>
                <p className="text-muted-foreground text-sm mt-1">Update your advertisement details</p>
            </motion.div>

            <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-4 mt-6">
                {/* Media */}
                <motion.div variants={fadeUp}>
                    <label className="text-sm font-bold text-foreground mb-2 block">Ad Media (Up to 5 images + 1 video)</label>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                        {existingPaths.map((src, i) => (
                            <div key={`existing-${i}`} className="relative w-24 h-24 rounded-xl overflow-hidden border border-border/50 shrink-0">
                                <img src={src} alt="" className="w-full h-full object-cover opacity-70" />
                                <button
                                    onClick={() => removeExisting(i)}
                                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive/80 flex items-center justify-center"
                                >
                                    <X className="w-3 h-3 text-destructive-foreground" />
                                </button>
                                <div className="absolute bottom-1 left-1 px-1 rounded bg-black/40 text-[8px] text-white">Saved</div>
                            </div>
                        ))}

                        {newPreviews.map((src, i) => (
                            <div key={`new-${i}`} className="relative w-24 h-24 rounded-xl overflow-hidden border border-primary/50 shrink-0">
                                <img src={src} alt="" className="w-full h-full object-cover" />
                                <button
                                    onClick={() => removeNew(i)}
                                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive/80 flex items-center justify-center"
                                >
                                    <X className="w-3 h-3 text-destructive-foreground" />
                                </button>
                                <div className="absolute bottom-1 left-1 px-1 rounded bg-primary text-[8px] text-white">New</div>
                            </div>
                        ))}

                        {(existingPaths.length + newImages.length) < 5 && (
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
                                    onClick={() => { setVideo(null); setVideoName(null); setExistingVideo(null); }}
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
                        className="w-full px-4 py-3.5 rounded-2xl bg-card border border-border/50 text-foreground text-sm shadow-sm"
                    />
                </motion.div>

                {/* Description */}
                <motion.div variants={fadeUp}>
                    <label className="text-sm font-bold text-foreground mb-2 block">Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3.5 rounded-2xl bg-card border border-border/50 text-foreground text-sm shadow-sm resize-none"
                    />
                </motion.div>

                {/* Link URL */}
                <motion.div variants={fadeUp}>
                    <label className="text-sm font-bold text-foreground mb-2 block">Link (optional)</label>
                    <input
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-4 py-3.5 rounded-2xl bg-card border border-border/50 text-foreground text-sm shadow-sm"
                    />
                </motion.div>

                {/* Submit */}
                <motion.div variants={fadeUp} className="mt-4">
                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleUpdate}
                        disabled={submitting}
                        className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 disabled:opacity-60"
                    >
                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {submitting ? "Updating..." : "Save Changes"}
                    </motion.button>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default EditAd;
