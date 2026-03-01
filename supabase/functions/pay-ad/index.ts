import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TELEGRAM_API = "https://api.telegram.org/bot";

function calculateAdStars(days: number): number {
  const clamped = Math.max(1, Math.min(30, Math.round(days)));
  const perDay = 14 - (clamped - 1) * 0.1;
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
    const { ad_id, telegram_id, days = 1 } = await req.json();

    if (!ad_id || !telegram_id) {
      return new Response(
        JSON.stringify({ error: "ad_id and telegram_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify ad belongs to user
    const { data: ad, error: adErr } = await supabase
      .from("ads")
      .select("id, title, owner_telegram_id")
      .eq("id", ad_id)
      .eq("owner_telegram_id", telegram_id)
      .single();

    if (adErr || !ad) {
      return new Response(
        JSON.stringify({ error: "Ad not found or not owned by you" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const starsAmount = calculateAdStars(days);
    const title = `Ad: ${ad.title}`;
    const description = `Sponsored ad placement for ${days} day${days > 1 ? "s" : ""}. Your ad will appear inline on the Explore page.`;

    const invoicePayload = {
      chat_id: telegram_id,
      title,
      description,
      payload: JSON.stringify({ ad_id, days, type: "ad" }),
      provider_token: "",
      currency: "XTR",
      prices: [{ label: `${days}-day Ad`, amount: starsAmount }],
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
    console.error("pay-ad error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
