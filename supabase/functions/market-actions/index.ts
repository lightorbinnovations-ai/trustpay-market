import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { validateTelegramWebAppData } from "../_shared/telegram-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-telegram-init-data",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Verify Telegram Authentication
    const initData = req.headers.get("x-telegram-init-data");
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");

    if (!initData || !botToken) {
      throw new Error("Missing authentication credentials");
    }

    const tgUser = validateTelegramWebAppData(initData, botToken);
    const userId = tgUser.id; // Keep as number

    // 2. Parse Payload
    const { action, payload } = await req.json();
    let result;

    switch (action) {
      case "create_listing": {
        const { title, description, price, category, type, city, latitude, longitude, country } = payload;

        const { data, error } = await supabaseClient
          .from("listings")
          .insert({
            title, description, price, category,
            type: type || "item", city, latitude, longitude, country,
            seller_telegram_id: userId,
            status: "active"
          })
          .select()
          .single();

        if (error) throw error;
        result = { success: true, listing: data };
        break;
      }

      case "update_listing": {
        const { id, title, description, price, category, city, status } = payload;

        // Verify ownership
        const { data: listing } = await supabaseClient.from("listings").select("seller_telegram_id").eq("id", id).single();
        if (!listing || listing.seller_telegram_id !== userId) throw new Error("Unauthorized to modify this listing");

        let updateData: any = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (price !== undefined) updateData.price = price;
        if (category !== undefined) updateData.category = category;
        if (city !== undefined) updateData.city = city;
        if (status !== undefined) updateData.status = status;

        const { error } = await supabaseClient.from("listings").update(updateData).eq("id", id);
        if (error) throw error;

        result = { success: true };
        break;
      }

      case "admin_update_listing_boost": {
        const { id, boosted_until } = payload;

        // Verify Admin Status
        const { data: userRecord } = await supabaseClient.from("bot_users").select("is_admin").eq("telegram_id", userId).single();
        if (!userRecord || !userRecord.is_admin) throw new Error("Unauthorized: Admin access required");

        const { error } = await supabaseClient.from("listings").update({ boosted_until }).eq("id", id);
        if (error) throw error;

        result = { success: true };
        break;
      }

      case "create_ad": {
        const { title, description, target_url, amount, duration_days } = payload;

        const { data, error } = await supabaseClient
          .from("ads")
          .insert({
            owner_telegram_id: userId,
            title, description,
            link_url: target_url,
            stars_paid: amount,
            duration_days,
            status: "pending_payment"
          })
          .select()
          .single();

        if (error) throw error;
        result = { success: true, ad: data };
        break;
      }

      case "update_ad_status": {
        const { id, status } = payload;
        const { data: ad } = await supabaseClient.from("ads").select("owner_telegram_id").eq("id", id).single();
        if (!ad || ad.owner_telegram_id !== userId) throw new Error("Unauthorized");

        const { error } = await supabaseClient.from("ads").update({ status }).eq("id", id);
        if (error) throw error;

        result = { success: true };
        break;
      }

      case "update_ad_media": {
        const { id, image_path, video_path } = payload;
        const { data: ad } = await supabaseClient.from("ads").select("owner_telegram_id").eq("id", id).single();
        if (!ad || ad.owner_telegram_id !== userId) throw new Error("Unauthorized");

        let updateData: any = {};
        if (image_path) updateData.image_path = image_path;
        if (video_path) updateData.video_path = video_path;

        const { error } = await supabaseClient.from("ads").update(updateData).eq("id", id);
        if (error) throw error;

        result = { success: true };
        break;
      }

      case "create_transaction": {
        const { amount, listing_id, seller_telegram_id, status } = payload;

        const { data, error } = await supabaseClient.from("transactions").insert({
          buyer_telegram_id: parseInt(userId),
          seller_telegram_id,
          listing_id,
          amount,
          status: status || "pending"
        }).select().single();

        if (error) throw error;
        result = { success: true, transaction: data };
        break;
      }

      case "toggle_favorite": {
        const { listing_id } = payload;

        // Check if exists
        const { data: existing } = await supabaseClient.from("favorites")
          .select("id")
          .eq("telegram_id", userId)
          .eq("listing_id", listing_id)
          .maybeSingle();

        if (existing) {
          const { error } = await supabaseClient.from("favorites").delete().eq("id", existing.id);
          if (error) throw error;
          result = { success: true, action: "removed" };
        } else {
          const { error } = await supabaseClient.from("favorites").insert({
            telegram_id: userId, listing_id
          });
          if (error) throw error;
          result = { success: true, action: "added" };
        }
        break;
      }

      case "mark_notification_read": {
        const { id } = payload;
        const { data: notif } = await supabaseClient.from("notifications").select("user_id").eq("id", id).single();
        if (!notif || notif.user_id !== userId) throw new Error("Unauthorized");

        const { error } = await supabaseClient.from("notifications").update({ is_read: true }).eq("id", id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "mark_all_notifications_read": {
        const { error } = await supabaseClient.from("notifications").update({ is_read: true }).eq("user_id", userId);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "create_review": {
        const { seller_id, listing_id, rating, comment } = payload;
        if (seller_id === userId) throw new Error("Cannot review yourself");

        const { data, error } = await supabaseClient.from("reviews").insert({
          reviewer_id: userId, seller_id, listing_id, rating, comment
        }).select().single();
        if (error) throw error;
        result = { success: true, review: data };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
