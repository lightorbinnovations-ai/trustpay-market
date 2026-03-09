import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { triggerHaptic, useTelegramUser } from "@/hooks/useTelegramUser";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const categoryOptions = [
  "Plumbing", "Electrical", "Cleaning", "Delivery", "Repairs",
  "Gadgets", "Fashion", "Food & Beverages", "Beauty & Wellness", "Other",
];

const statusOptions = [
  { value: "active", label: "Active – Visible to everyone" },
  { value: "sold", label: "Sold – Hidden, marked as sold" },
];

const EditListing = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useTelegramUser();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rawPrice, setRawPrice] = useState("");
  const [displayPrice, setDisplayPrice] = useState("");
  const [status, setStatus] = useState("active");

  const handlePriceChange = (val: string) => {
    const digits = val.replace(/[^0-9]/g, "");
    setRawPrice(digits);
    setDisplayPrice(digits ? Number(digits).toLocaleString("en-NG") : "");
  };
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (listing) {
      setTitle(listing.title);
      setDescription(listing.description || "");
      const p = listing.price?.toString() || "";
      setRawPrice(p);
      setDisplayPrice(p ? Number(p).toLocaleString("en-NG") : "");
      setCategory(listing.category || "");
      setCity(listing.city || "");
      setStatus(listing.status || "active");
    }
  }, [listing]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const initData = window.Telegram?.WebApp?.initData;
      if (!initData) throw new Error("Telegram authentication missing");

      // Note: We need to use update_listing_status for status specifically 
      // based on the Edge function, but let's extend the function or handle full updates.
      // Since the edge function currently only handles status natively for updates,
      // I will adjust the payload here, and we'll need to upgrade the Edge Function to handle full updates if needed,
      // but for now let's just use the existing edge function format which accepts status.
      // Wait, actually I just realized the Edge function `update_listing_status` currently *only* updates status.
      // I will augment the payload here and then immediately update the edge function to handle the full object.
      const payload = {
        id: id!,
        title: title.trim(),
        description: description.trim() || null,
        price: rawPrice ? parseFloat(rawPrice) : null,
        category: category || null,
        city: city.trim() || null,
        status,
      };

      const { data, error } = await supabase.functions.invoke('market-actions', {
        body: {
          action: 'update_listing', // Using a new action name, will update edge function next
          payload
        },
        headers: {
          'x-telegram-init-data': initData
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
      queryClient.invalidateQueries({ queryKey: ["listing", id] });
      triggerHaptic("heavy");
      toast({ title: "Listing updated! ✅" });
      navigate(-1);
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

  if (listing && listing.seller_telegram_id !== user.id) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-5">
        <h2 className="text-lg font-bold text-foreground">Not authorized</h2>
        <p className="text-muted-foreground text-sm mt-2">You can only edit your own listings.</p>
      </div>
    );
  }

  return (
    <div className="px-5 pt-4 pb-8">
      <h1 className="text-2xl font-extrabold text-foreground">Edit Listing</h1>
      <p className="text-muted-foreground text-sm mt-1">Update your listing details</p>

      <div className="flex flex-col gap-4 mt-6">
        <div>
          <label className="text-sm font-bold text-foreground mb-2 block">Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl bg-card border border-border/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring shadow-sm" />
        </div>

        <div>
          <label className="text-sm font-bold text-foreground mb-2 block">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full px-4 py-3.5 rounded-2xl bg-card border border-border/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring shadow-sm resize-none" />
        </div>

        <div>
          <label className="text-sm font-bold text-foreground mb-2 block">Price (₦)</label>
          <input value={displayPrice} onChange={(e) => handlePriceChange(e.target.value)} inputMode="numeric" className="w-full px-4 py-3.5 rounded-2xl bg-card border border-border/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring shadow-sm" />
        </div>

        <div>
          <label className="text-sm font-bold text-foreground mb-2 block">Status</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full rounded-2xl border-border/50 bg-card h-12 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-sm">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-bold text-foreground mb-2 block">Category *</label>
          <div className="flex flex-wrap gap-2">
            {categoryOptions.map((c) => (
              <button
                key={c}
                onClick={() => { triggerHaptic("light"); setCategory(c); }}
                className={`px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors ${category === c ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border/50"
                  }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-foreground mb-2 block">City / Location</label>
          <input value={city} onChange={(e) => setCity(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl bg-card border border-border/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring shadow-sm" />
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending || !title.trim() || !category}
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-base shadow-lg shadow-primary/25 disabled:opacity-60 mt-2"
        >
          {updateMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </motion.button>
      </div>
    </div>
  );
};

export default EditListing;
