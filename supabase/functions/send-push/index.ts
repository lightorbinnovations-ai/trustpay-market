import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipient_telegram_id, title, message, listing_id } =
      await req.json();

    if (!recipient_telegram_id || !message) {
      return new Response(
        JSON.stringify({ error: "Missing recipient or message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      return new Response(
        JSON.stringify({ error: "Bot token not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build message text with optional deep link
    let text = `*${escapeMarkdown(title)}*\n\n${escapeMarkdown(message)}`;
    
    // Add inline keyboard if listing_id is provided
    const replyMarkup = listing_id
      ? {
          inline_keyboard: [
            [
              {
                text: "View Listing",
                url: `https://t.me/TrustPayMarketsBot?start=listing_${listing_id}`,
              },
            ],
          ],
        }
      : undefined;

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const body: Record<string, unknown> = {
      chat_id: recipient_telegram_id,
      text,
      parse_mode: "MarkdownV2",
    };
    if (replyMarkup) body.reply_markup = replyMarkup;

    const res = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const result = await res.json();

    if (!result.ok) {
      // If MarkdownV2 fails, retry without formatting
      const retryBody: Record<string, unknown> = {
        chat_id: recipient_telegram_id,
        text: `${title}\n\n${message}`,
      };
      if (replyMarkup) retryBody.reply_markup = replyMarkup;

      const retryRes = await fetch(telegramUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(retryBody),
      });
      const retryResult = await retryRes.json();

      return new Response(JSON.stringify(retryResult), {
        status: retryResult.ok ? 200 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function escapeMarkdown(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}
