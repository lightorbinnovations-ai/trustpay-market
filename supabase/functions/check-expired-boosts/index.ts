import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TELEGRAM_API = "https://api.telegram.org/bot";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

    // Find listings whose boost expired in the last hour
    const { data: expiredListings, error } = await supabase
      .from("listings")
      .select("id, title, seller_telegram_id, boosted_until")
      .not("boosted_until", "is", null)
      .lte("boosted_until", now.toISOString())
      .gte("boosted_until", oneHourAgo);

    if (error) throw error;

    if (!expiredListings || expiredListings.length === 0) {
      return new Response(
        JSON.stringify({ message: "No expired boosts found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get admin user (lightorbinnovations)
    const { data: adminUser } = await supabase
      .from("bot_users")
      .select("telegram_id")
      .eq("username", "lightorbinnovations")
      .single();

    const adminId = adminUser?.telegram_id;

    for (const listing of expiredListings) {
      // Check if we already notified about this expiry
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("recipient_telegram_id", listing.seller_telegram_id)
        .eq("type", "boost_activated")
        .eq("listing_id", listing.id)
        .gte("created_at", oneHourAgo)
        .limit(1);

      if (existing && existing.length > 0) continue;

      // Notify seller
      await supabase.from("notifications").insert({
        recipient_telegram_id: listing.seller_telegram_id,
        type: "boost_activated",
        title: "Boost expired 🚀",
        message: `Your boost for "${listing.title}" has expired. Re-boost to maintain visibility!`,
        listing_id: listing.id,
      });

      // Send Telegram push to seller
      try {
        await fetch(`${TELEGRAM_API}${BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: listing.seller_telegram_id,
            text: `🚀 Your boost for "${listing.title}" has expired!\n\nRe-boost to maintain visibility and reach more buyers.`,
          }),
        });
      } catch { /* non-blocking */ }

      // Notify admin
      if (adminId && adminId !== listing.seller_telegram_id) {
        await supabase.from("notifications").insert({
          recipient_telegram_id: adminId,
          type: "boost_activated",
          title: "Boost expired (Admin) 🚀",
          message: `Boost expired for "${listing.title}" (seller ID: ${listing.seller_telegram_id})`,
          listing_id: listing.id,
        });
      }
    }

    return new Response(
      JSON.stringify({ message: `Processed ${expiredListings.length} expired boosts` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("check-expired-boosts error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
