import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TELEGRAM_API = "https://api.telegram.org/bot";

// 80-100 Stars for 1 month (~₦3,000-₦3,700)
const VERIFIED_STARS = 90;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

  try {
    const { telegram_id } = await req.json();

    if (!telegram_id) {
      return new Response(
        JSON.stringify({ error: "telegram_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const invoicePayload = {
      chat_id: telegram_id,
      title: "Verified Seller Badge ✅",
      description: "Get a verified badge next to your name for 30 days. Build trust with buyers and stand out in the marketplace.",
      payload: JSON.stringify({ type: "verified_badge", telegram_id }),
      provider_token: "",
      currency: "XTR",
      prices: [{ label: "30-day Verified Badge", amount: VERIFIED_STARS }],
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
    console.error("verify-seller error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
