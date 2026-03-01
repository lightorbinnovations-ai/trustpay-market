import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TELEGRAM_API = "https://api.telegram.org/bot";

/**
 * Pricing: 1-30 days slider with volume discount.
 * Base rate: 10 Stars/day → discounted down to ~8 Stars/day at 30 days.
 * Formula: stars = round(days * (10 - (days - 1) * 0.069))
 * Day 1  = 10 Stars (~₦370)
 * Day 7  = 67 Stars (~₦2,500)
 * Day 30 = 240 Stars (~₦8,880)
 */
function calculateBoostStars(days: number): number {
  const clamped = Math.max(1, Math.min(30, Math.round(days)));
  const perDay = 10 - (clamped - 1) * 0.069;
  return Math.round(clamped * perDay);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { listing_id, telegram_id, days = 1 } = await req.json();

    if (!listing_id || !telegram_id) {
      return new Response(
        JSON.stringify({ error: "listing_id and telegram_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify listing belongs to user
    const { data: listing, error: listingErr } = await supabase
      .from("listings")
      .select("id, title, seller_telegram_id")
      .eq("id", listing_id)
      .eq("seller_telegram_id", telegram_id)
      .single();

    if (listingErr || !listing) {
      return new Response(
        JSON.stringify({ error: "Listing not found or not owned by you" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const starsAmount = calculateBoostStars(days);
    const title = `Boost: ${listing.title}`;
    const description = `Priority placement for ${days} day${days > 1 ? "s" : ""}. Your listing will appear at the top of search results and the home feed.`;

    const invoicePayload = {
      chat_id: telegram_id,
      title,
      description,
      payload: JSON.stringify({ listing_id, days }),
      provider_token: "",
      currency: "XTR",
      prices: [{ label: `${days}-day Boost`, amount: starsAmount }],
    };

    const res = await fetch(`${TELEGRAM_API}${BOT_TOKEN}/sendInvoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invoicePayload),
    });

    const result = await res.json();

    if (!result.ok) {
      console.error("Telegram sendInvoice failed:", result);
      return new Response(
        JSON.stringify({ error: "Failed to send invoice", details: result.description }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Invoice sent to your Telegram chat" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("boost-listing error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
