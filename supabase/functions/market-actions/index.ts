import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { validateTelegramWebAppData } from "../_shared/telegram-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-telegram-init-data",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
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

    // --- Notification Helpers ---
    async function sendPush(recipientId: number, title: string, message: string, listingId?: string) {
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: recipientId,
            text: `*${title.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$1")}*\n\n${message.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$1")}`,
            parse_mode: "MarkdownV2",
            reply_markup: listingId ? {
              inline_keyboard: [[{ text: "View Listing", url: `https://t.me/TrustPayMarketsBot?start=listing_${listingId}` }]]
            } : undefined
          })
        });
      } catch (e) {
        console.error("Push failed:", e);
      }
    }

    async function createNotification(params: {
      recipient_id: number;
      type: string;
      title: string;
      message: string;
      listing_id?: string;
      sender_id?: number;
    }) {
      await supabaseClient.from("notifications").insert({
        recipient_telegram_id: params.recipient_id,
        type: params.type,
        title: params.title,
        message: params.message,
        listing_id: params.listing_id || null,
        sender_telegram_id: params.sender_id || null,
      });
      await sendPush(params.recipient_id, params.title, params.message, params.listing_id);
    }

    async function notifyAdmins(title: string, message: string, listingId?: string) {
      const { data: admins } = await supabaseClient.from("bot_users").select("telegram_id").eq("is_admin", true);
      if (admins) {
        for (const admin of admins) {
          await sendPush(admin.telegram_id, title, message, listingId);
        }
      }
    }
    // --- End Helpers ---

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

        // Notify Admins
        await notifyAdmins("New Listing! 🆕", `A new listing "${title}" has been posted in ${city || "General"}.`, data.id);

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
        const { title, description, link_url, stars_paid, image_path, video_path, image_paths } = payload;

        const { data, error } = await supabaseClient
          .from("ads")
          .insert({
            owner_telegram_id: userId,
            title,
            description,
            link_url,
            stars_paid,
            image_path,
            video_path,
            image_paths: image_paths || [],
            status: "pending"
          })
          .select()
          .single();

        if (error) throw error;

        // Notify Admins
        await notifyAdmins("New Ad Submitted 📢", `A new ad "${title}" is pending approval.`, undefined);

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

      case "edit_ad": {
        const { id, title, description, link_url, image_path, video_path, image_paths } = payload;

        // Authorization check
        const { data: ad, error: fetchError } = await supabaseClient
          .from("ads")
          .select("owner_telegram_id")
          .eq("id", id)
          .single();

        if (fetchError || !ad) throw new Error("Ad not found");
        if (ad.owner_telegram_id !== userId) throw new Error("Unauthorized");

        const updateData: any = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (link_url !== undefined) updateData.link_url = link_url;
        if (image_path !== undefined) updateData.image_path = image_path;
        if (video_path !== undefined) updateData.video_path = video_path;
        if (image_paths !== undefined) updateData.image_paths = image_paths;

        const { data, error } = await supabaseClient
          .from("ads")
          .update(updateData)
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;
        result = { success: true, ad: data };
        break;
      }

      case "track_ad_view": {
        const { id } = payload;
        // Don't count the ad owner's own views
        const { data: adOwner } = await supabaseClient
          .from("ads")
          .select("owner_telegram_id")
          .eq("id", id)
          .single();
        if (adOwner && adOwner.owner_telegram_id !== userId) {
          await supabaseClient.rpc('increment_ad_views', { ad_id: id });
        }
        result = { success: true };
        break;
      }

      case "track_ad_click": {
        const { id } = payload;
        // Don't count the ad owner's own clicks
        const { data: adOwner } = await supabaseClient
          .from("ads")
          .select("owner_telegram_id")
          .eq("id", id)
          .single();
        if (adOwner && adOwner.owner_telegram_id !== userId) {
          await supabaseClient.rpc('increment_ad_clicks', { ad_id: id });
        }
        result = { success: true };
        break;
      }

      case "create_transaction": {
        const { amount, listing_id, seller_telegram_id, status } = payload;

        const { data, error } = await supabaseClient.from("transactions").insert({
          buyer_telegram_id: userId,
          seller_telegram_id,
          listing_id,
          amount,
          status: status || "pending"
        }).select().single();

        if (error) throw error;
        result = { success: true, transaction: data };
        break;
      }

      case "mark_as_bought": {
        const { listing_id, seller_telegram_id, amount } = payload;

        // Create a transaction record for the buyer's purchase
        const { data: tx, error: txError } = await supabaseClient
          .from("transactions")
          .insert({
            buyer_telegram_id: userId,
            seller_telegram_id,
            listing_id,
            amount: amount || 0,
            status: "released"
          })
          .select("*, listings(title)")
          .single();

        if (txError) throw txError;

        // Notify the seller via DB + Push
        await createNotification({
          recipient_id: seller_telegram_id,
          type: "transaction_started",
          title: "Item Sold! 🎉",
          message: `Someone just marked your item "${tx.listings?.title || "Listing"}" as bought! Check your transactions.`,
          listing_id,
          sender_id: userId,
        });

        // NOTE: Listing stays "active" — only the seller can mark it as "sold"
        result = { success: true, transaction: tx };
        break;
      }

      case "mark_listing_sold": {
        const { listing_id } = payload;

        // Verify the caller is the owner
        const { data: listing } = await supabaseClient
          .from("listings")
          .select("seller_telegram_id")
          .eq("id", listing_id)
          .single();

        if (!listing || listing.seller_telegram_id !== userId) {
          throw new Error("Unauthorized: Only the seller can mark this listing as sold");
        }

        const { error } = await supabaseClient
          .from("listings")
          .update({ status: "sold" })
          .eq("id", listing_id);

        if (error) throw error;
        result = { success: true };
        break;
      }


      case "update_transaction_status": {
        const { id, status } = payload;

        // Ensure ownership
        const { data: tx } = await supabaseClient.from("transactions").select("buyer_telegram_id").eq("id", id).single();
        if (!tx || tx.buyer_telegram_id !== userId) throw new Error("Unauthorized");

        const { error } = await supabaseClient.from("transactions").update({ status }).eq("id", id);
        if (error) throw error;

        // Notify both parties (fetching tx details first)
        const { data: fullTx } = await supabaseClient
          .from("transactions")
          .select("*, listings(title)")
          .eq("id", id)
          .single();

        if (fullTx) {
          const title = "Transaction Updated 🔄";
          const msg = `Transaction for "${fullTx.listings?.title || "Listing"}" changed to: ${status}`;
          
          // Notify Seller if status changed by Buyer
          await createNotification({
            recipient_id: fullTx.seller_telegram_id,
            type: `transaction_${status}`,
            title,
            message: msg,
            listing_id: fullTx.listing_id,
            sender_id: userId
          });
        }

        result = { success: true };
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
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
