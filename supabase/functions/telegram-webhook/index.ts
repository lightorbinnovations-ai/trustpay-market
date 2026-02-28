import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_API = "https://api.telegram.org/bot";
const BANNER_URL = "https://wovbwtextiqakzowoypf.supabase.co/storage/v1/object/public/listing-images/bot%2Fwelcome-banner.jpg";
const MINI_APP_URL = "https://trustpaymarket.lovable.app";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("OK", { status: 200 });
  }

  const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const update = await req.json();
    const message = update.message;
    const callback = update.callback_query;

    // ─── Handle pre_checkout_query (Telegram Stars) ───
    if (update.pre_checkout_query) {
      const pcq = update.pre_checkout_query;
      await fetch(`${TELEGRAM_API}${BOT_TOKEN}/answerPreCheckoutQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pre_checkout_query_id: pcq.id, ok: true }),
      });
      return new Response("OK");
    }

    // ─── Handle successful_payment (Telegram Stars) ───
    if (message?.successful_payment) {
      const payment = message.successful_payment;
      const chatId = message.chat.id;
      const userId = message.from.id;

      try {
        const payload = JSON.parse(payment.invoice_payload);

        // ── Ad payment ──
        if (payload.type === "ad" && payload.ad_id) {
          const { ad_id, days } = payload;
          const now = new Date();
          const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

          await supabase
            .from("ads")
            .update({
              status: "active",
              stars_paid: payment.total_amount,
              starts_at: now.toISOString(),
              expires_at: expiresAt,
            })
            .eq("id", ad_id)
            .eq("owner_telegram_id", userId);

          await supabase.from("notifications").insert({
            recipient_telegram_id: userId,
            type: "ad_activated",
            title: "Ad is live! 📢",
            message: `Your ad is now running for ${days} day${days > 1 ? "s" : ""}. It will appear on the Explore page.`,
          });

          await sendMessage(
            BOT_TOKEN,
            chatId,
            `📢 *Ad Activated\\!*\n\nYour sponsored ad is now live for ${days} day${days > 1 ? "s" : ""}\\!\n\nIt will appear inline on the Explore page\\.`,
            {
              inline_keyboard: [
                [{ text: "📋 View My Ads", web_app: { url: `${MINI_APP_URL}/profile/ads` } }],
              ],
            }
          );
        }
        // ── Verified Badge payment ──
        else if (payload.type === "verified_badge" && payload.telegram_id) {
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

          // Upsert: if already exists update expiry, else insert
          const { error: vErr } = await supabase
            .from("verified_sellers")
            .upsert({
              telegram_id: userId,
              stars_paid: payment.total_amount,
              starts_at: new Date().toISOString(),
              expires_at: expiresAt,
            }, { onConflict: "telegram_id" });

          if (vErr) console.error("Failed to upsert verified_sellers:", vErr);

          await supabase.from("notifications").insert({
            recipient_telegram_id: userId,
            type: "verified_activated",
            title: "Verified Badge Activated! ✅",
            message: "You're now a verified seller for 30 days. Your badge will appear next to your name everywhere.",
          });

          await sendMessage(
            BOT_TOKEN,
            chatId,
            `✅ *Verified Badge Activated\\!*\n\nYou're now a verified seller for 30 days\\. Your badge appears next to your name everywhere on the marketplace\\.`,
            {
              inline_keyboard: [
                [{ text: "👤 View Profile", web_app: { url: `${MINI_APP_URL}/profile` } }],
              ],
            }
          );
        }
        // ── Boost payment ──
        else if (payload.listing_id && payload.days) {
          const { listing_id, days } = payload;
          const boostedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

          const { error: updateErr } = await supabase
            .from("listings")
            .update({ boosted_until: boostedUntil })
            .eq("id", listing_id)
            .eq("seller_telegram_id", userId);

          if (updateErr) console.error("Failed to update listing boost:", updateErr);

          await supabase.from("transactions").insert({
            listing_id,
            seller_telegram_id: userId,
            buyer_telegram_id: userId,
            amount: payment.total_amount,
            status: "released",
            boost_listing_id: listing_id,
          });

          const { data: listing } = await supabase
            .from("listings")
            .select("title")
            .eq("id", listing_id)
            .single();

          const listingTitle = listing?.title || "your listing";

          await supabase.from("notifications").insert({
            recipient_telegram_id: userId,
            type: "boost_activated",
            title: "Boost activated! 🚀",
            message: `Your listing "${listingTitle}" is now boosted for ${days} day${days > 1 ? "s" : ""}. It will appear at the top of search results!`,
            listing_id,
          });

          await sendMessage(
            BOT_TOKEN,
            chatId,
            `🚀 *Boost Activated\\!*\n\nYour listing "*${escapeMarkdown(listingTitle)}*" is now boosted for ${days} day${days > 1 ? "s" : ""}\\!\n\nIt will appear at the top of search results and the home feed\\.`,
            {
              inline_keyboard: [
                [{ text: "📋 View My Listings", web_app: { url: `${MINI_APP_URL}/profile/listings` } }],
              ],
            }
          );
        }
      } catch (e) {
        console.error("Error processing payment:", e);
      }

      return new Response("OK");
    }

    // ─── Handle callback queries ───
    if (callback) {
      const chatId = callback.message.chat.id;
      const data = callback.data;
      const userId = callback.from.id;

      // Answer callback immediately to remove loading state
      await fetch(`${TELEGRAM_API}${BOT_TOKEN}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: callback.id }),
      });

      if (data === "help") {
        await sendMessage(BOT_TOKEN, chatId, helpText(), helpKeyboard());
      }

      // ─── Escrow: Buyer confirms payment ───
      if (data?.startsWith("escrow_confirm_")) {
        const txId = data.replace("escrow_confirm_", "");
        await handleEscrowConfirmPayment(supabase, BOT_TOKEN, chatId, userId, txId);
      }

      // ─── Escrow: Seller marks delivered ───
      if (data?.startsWith("escrow_delivered_")) {
        const txId = data.replace("escrow_delivered_", "");
        await handleEscrowDelivered(supabase, BOT_TOKEN, chatId, userId, txId);
      }

      // ─── Escrow: Buyer confirms receipt ───
      if (data?.startsWith("escrow_received_")) {
        const txId = data.replace("escrow_received_", "");
        await handleEscrowReceived(supabase, BOT_TOKEN, chatId, userId, txId);
      }

      // ─── Escrow: Buyer raises dispute ───
      if (data?.startsWith("escrow_dispute_")) {
        const txId = data.replace("escrow_dispute_", "");
        await handleEscrowDispute(supabase, BOT_TOKEN, chatId, userId, txId);
      }

      return new Response("OK");
    }

    if (!message?.text) return new Response("OK");

    const chatId = message.chat.id;
    const text = message.text.trim();
    const user = message.from;

    // Auto-register user
    await upsertUser(supabase, user);

    if (text === "/start" || text === "/start ") {
      await sendWelcome(BOT_TOKEN, chatId, user.first_name);
    } else if (text.startsWith("/start escrow_")) {
      // ─── Escrow deep link ───
      const listingId = text.replace("/start escrow_", "").trim();
      await handleEscrowStart(supabase, BOT_TOKEN, chatId, user, listingId);
    } else if (text.startsWith("/start listing_")) {
      const listingId = text.replace("/start listing_", "").trim();
      await sendListingDeepLink(BOT_TOKEN, supabase, chatId, listingId);
    } else if (text === "/help") {
      await sendMessage(BOT_TOKEN, chatId, helpText(), helpKeyboard());
    } else if (text === "/mylistings") {
      await sendMyListings(BOT_TOKEN, supabase, chatId, user.id);
    } else {
      await sendMessage(BOT_TOKEN, chatId,
        "🤖 I didn't understand that\\. Use /start to open the marketplace or /help for commands\\.",
        null
      );
    }

    return new Response("OK");
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("Error", { status: 500 });
  }
});

// ═══════════════════════════════════════════════
// ESCROW HANDLERS
// ═══════════════════════════════════════════════

/** Step 1: Buyer opens escrow deep link → show listing details + confirm button */
async function handleEscrowStart(supabase: any, token: string, chatId: number, tgUser: any, listingId: string) {
  // Fetch listing
  const { data: listing, error } = await supabase
    .from("listings")
    .select("id, title, price, category, city, seller_telegram_id")
    .eq("id", listingId)
    .single();

  if (error || !listing) {
    await sendMessage(token, chatId, "😕 Listing not found or no longer available\\.", null);
    return;
  }

  // Can't escrow your own listing
  if (listing.seller_telegram_id === tgUser.id) {
    await sendMessage(token, chatId, "⚠️ You can't start an escrow payment for your own listing\\.", null);
    return;
  }

  // Get seller info
  const { data: seller } = await supabase
    .from("bot_users")
    .select("first_name, username")
    .eq("telegram_id", listing.seller_telegram_id)
    .single();

  // Find or create pending transaction
  const { data: existingTx } = await supabase
    .from("transactions")
    .select("id")
    .eq("listing_id", listingId)
    .eq("buyer_telegram_id", tgUser.id)
    .eq("status", "pending")
    .is("boost_listing_id", null)
    .order("created_at", { ascending: false })
    .limit(1);

  let txId: string;

  if (existingTx && existingTx.length > 0) {
    txId = existingTx[0].id;
  } else {
    const { data: newTx, error: txErr } = await supabase
      .from("transactions")
      .insert({
        listing_id: listingId,
        buyer_telegram_id: tgUser.id,
        seller_telegram_id: listing.seller_telegram_id,
        amount: listing.price || 0,
        status: "pending",
      })
      .select("id")
      .single();

    if (txErr) {
      console.error("Failed to create transaction:", txErr);
      await sendMessage(token, chatId, "❌ Failed to start escrow\\. Please try again\\.", null);
      return;
    }
    txId = newTx.id;
  }

  const price = listing.price != null ? `₦${Number(listing.price).toLocaleString("en-NG")}` : "Free";
  const sellerName = seller?.username ? `@${seller.username}` : seller?.first_name || "Seller";

  const text =
    `🛡 *TrustPay Escrow*\n\n` +
    `📦 *Item:* ${escapeMarkdown(listing.title)}\n` +
    `💰 *Amount:* ${escapeMarkdown(price)}\n` +
    `👤 *Seller:* ${escapeMarkdown(sellerName)}\n` +
    `📍 *Location:* ${escapeMarkdown(listing.city || "N/A")}\n\n` +
    `*How it works:*\n` +
    `1️⃣ You confirm payment below\n` +
    `2️⃣ Payment is held in escrow\n` +
    `3️⃣ Seller delivers the item/service\n` +
    `4️⃣ You confirm receipt → funds released\n\n` +
    `⚠️ _Your money is protected\\. It will only be released after you confirm delivery\\._`;

  const keyboard = {
    inline_keyboard: [
      [{ text: "✅ Confirm Payment", callback_data: `escrow_confirm_${txId}` }],
      [{ text: "🔍 View Listing", web_app: { url: `${MINI_APP_URL}/listing/${listingId}` } }],
    ],
  };

  await sendMessage(token, chatId, text, keyboard);
}

/** Step 2: Buyer confirms → status becomes "paid", notify seller */
async function handleEscrowConfirmPayment(supabase: any, token: string, chatId: number, buyerId: number, txId: string) {
  const { data: tx, error } = await supabase
    .from("transactions")
    .select("*, listings(title, id)")
    .eq("id", txId)
    .single();

  if (error || !tx) {
    await sendMessage(token, chatId, "❌ Transaction not found\\.", null);
    return;
  }

  if (tx.buyer_telegram_id !== buyerId) {
    await sendMessage(token, chatId, "⚠️ You are not the buyer for this transaction\\.", null);
    return;
  }

  if (tx.status !== "pending") {
    await sendMessage(token, chatId, `ℹ️ This transaction is already *${escapeMarkdown(tx.status)}*\\.`, null);
    return;
  }

  // Update to paid
  await supabase
    .from("transactions")
    .update({ status: "paid", updated_at: new Date().toISOString() })
    .eq("id", txId);

  // Get buyer info
  const { data: buyer } = await supabase
    .from("bot_users")
    .select("first_name, username")
    .eq("telegram_id", buyerId)
    .single();

  const buyerName = buyer?.username ? `@${buyer.username}` : buyer?.first_name || "Buyer";
  const listingTitle = tx.listings?.title || "Item";
  const price = `₦${Number(tx.amount).toLocaleString("en-NG")}`;

  // Notify buyer
  await sendMessage(token, chatId,
    `✅ *Payment Confirmed\\!*\n\n` +
    `${escapeMarkdown(price)} is now held in escrow for "*${escapeMarkdown(listingTitle)}*"\\.\n\n` +
    `The seller has been notified\\. Once they deliver, you'll be asked to confirm receipt\\.`,
    null
  );

  // Notify seller via Telegram
  const { data: sellerUser } = await supabase
    .from("bot_users")
    .select("telegram_id")
    .eq("telegram_id", tx.seller_telegram_id)
    .single();

  if (sellerUser) {
    await sendMessage(token, tx.seller_telegram_id,
      `💰 *Escrow Payment Received\\!*\n\n` +
      `${escapeMarkdown(buyerName)} has paid ${escapeMarkdown(price)} for "*${escapeMarkdown(listingTitle)}*"\\.\n\n` +
      `Please deliver the item/service and tap the button below when done\\.`,
      {
        inline_keyboard: [
          [{ text: "📦 Mark as Delivered", callback_data: `escrow_delivered_${txId}` }],
        ],
      }
    );
  }

  // Insert notifications
  await supabase.from("notifications").insert({
    recipient_telegram_id: tx.seller_telegram_id,
    type: "escrow_paid",
    title: "Escrow payment received 💰",
    message: `${buyerName} paid ${price} for "${listingTitle}". Please deliver and wait for confirmation.`,
    listing_id: tx.listings?.id || null,
    sender_telegram_id: buyerId,
  });
}

/** Step 3: Seller marks as delivered → ask buyer to confirm */
async function handleEscrowDelivered(supabase: any, token: string, chatId: number, sellerId: number, txId: string) {
  const { data: tx, error } = await supabase
    .from("transactions")
    .select("*, listings(title, id)")
    .eq("id", txId)
    .single();

  if (error || !tx) {
    await sendMessage(token, chatId, "❌ Transaction not found\\.", null);
    return;
  }

  if (tx.seller_telegram_id !== sellerId) {
    await sendMessage(token, chatId, "⚠️ You are not the seller for this transaction\\.", null);
    return;
  }

  if (tx.status !== "paid") {
    await sendMessage(token, chatId, `ℹ️ This transaction is *${escapeMarkdown(tx.status)}*\\. Can only mark delivered when status is "paid"\\.`, null);
    return;
  }

  const listingTitle = tx.listings?.title || "Item";

  // Get seller info
  const { data: seller } = await supabase
    .from("bot_users")
    .select("first_name, username")
    .eq("telegram_id", sellerId)
    .single();

  const sellerName = seller?.username ? `@${seller.username}` : seller?.first_name || "Seller";

  // Confirm to seller
  await sendMessage(token, chatId,
    `📦 *Delivery Marked\\!*\n\n` +
    `You've marked "*${escapeMarkdown(listingTitle)}*" as delivered\\.\n` +
    `The buyer will now be asked to confirm receipt\\. Payment will be released once confirmed\\.`,
    null
  );

  // Ask buyer to confirm
  await sendMessage(token, tx.buyer_telegram_id,
    `📦 *Delivery Notification*\n\n` +
    `${escapeMarkdown(sellerName)} has marked "*${escapeMarkdown(listingTitle)}*" as delivered\\.\n\n` +
    `Have you received the item/service? Please confirm or raise a dispute\\.`,
    {
      inline_keyboard: [
        [{ text: "✅ Confirm Receipt", callback_data: `escrow_received_${txId}` }],
        [{ text: "⚠️ Raise Dispute", callback_data: `escrow_dispute_${txId}` }],
      ],
    }
  );

  // Notification
  await supabase.from("notifications").insert({
    recipient_telegram_id: tx.buyer_telegram_id,
    type: "escrow_delivered",
    title: "Seller marked delivery 📦",
    message: `${sellerName} says "${listingTitle}" has been delivered. Please confirm receipt.`,
    listing_id: tx.listings?.id || null,
    sender_telegram_id: sellerId,
  });
}

/** Step 4a: Buyer confirms receipt → release funds */
async function handleEscrowReceived(supabase: any, token: string, chatId: number, buyerId: number, txId: string) {
  const { data: tx, error } = await supabase
    .from("transactions")
    .select("*, listings(title, id)")
    .eq("id", txId)
    .single();

  if (error || !tx) {
    await sendMessage(token, chatId, "❌ Transaction not found\\.", null);
    return;
  }

  if (tx.buyer_telegram_id !== buyerId) {
    await sendMessage(token, chatId, "⚠️ You are not the buyer for this transaction\\.", null);
    return;
  }

  if (tx.status === "released") {
    await sendMessage(token, chatId, "ℹ️ Payment has already been released\\.", null);
    return;
  }

  const listingTitle = tx.listings?.title || "Item";
  const price = `₦${Number(tx.amount).toLocaleString("en-NG")}`;

  // Update to released
  await supabase
    .from("transactions")
    .update({ status: "released", updated_at: new Date().toISOString() })
    .eq("id", txId);

  // Notify buyer
  await sendMessage(token, chatId,
    `✅ *Transaction Complete\\!*\n\n` +
    `You've confirmed receipt of "*${escapeMarkdown(listingTitle)}*"\\.\n` +
    `${escapeMarkdown(price)} has been released to the seller\\.\n\n` +
    `Thank you for using TrustPay\\! 🛡`,
    {
      inline_keyboard: [
        [{ text: "⭐ Rate This Seller", web_app: { url: `${MINI_APP_URL}/profile/transactions` } }],
        [{ text: "🛒 Browse More", web_app: { url: `${MINI_APP_URL}/home` } }],
      ],
    }
  );

  // Notify seller
  const { data: buyer } = await supabase
    .from("bot_users")
    .select("first_name, username")
    .eq("telegram_id", buyerId)
    .single();

  const buyerName = buyer?.username ? `@${buyer.username}` : buyer?.first_name || "Buyer";

  await sendMessage(token, tx.seller_telegram_id,
    `🎉 *Payment Released\\!*\n\n` +
    `${escapeMarkdown(buyerName)} confirmed receipt of "*${escapeMarkdown(listingTitle)}*"\\.\n` +
    `${escapeMarkdown(price)} has been released to you\\.\n\n` +
    `Great job\\! 🛡`,
    null
  );

  // Notifications for both
  await supabase.from("notifications").insert([
    {
      recipient_telegram_id: tx.seller_telegram_id,
      type: "escrow_released",
      title: "Payment released! 🎉",
      message: `${buyerName} confirmed receipt. ${price} released for "${listingTitle}".`,
      listing_id: tx.listings?.id || null,
      sender_telegram_id: buyerId,
    },
    {
      recipient_telegram_id: buyerId,
      type: "escrow_released",
      title: "Transaction complete ✅",
      message: `You confirmed receipt of "${listingTitle}". ${price} released to seller.`,
      listing_id: tx.listings?.id || null,
    },
  ]);
}

/** Step 4b: Buyer raises dispute */
async function handleEscrowDispute(supabase: any, token: string, chatId: number, buyerId: number, txId: string) {
  const { data: tx, error } = await supabase
    .from("transactions")
    .select("*, listings(title, id)")
    .eq("id", txId)
    .single();

  if (error || !tx) {
    await sendMessage(token, chatId, "❌ Transaction not found\\.", null);
    return;
  }

  if (tx.buyer_telegram_id !== buyerId) {
    await sendMessage(token, chatId, "⚠️ You are not the buyer for this transaction\\.", null);
    return;
  }

  if (tx.status === "disputed") {
    await sendMessage(token, chatId, "ℹ️ A dispute has already been raised for this transaction\\.", null);
    return;
  }

  const listingTitle = tx.listings?.title || "Item";
  const price = `₦${Number(tx.amount).toLocaleString("en-NG")}`;

  // Update to disputed
  await supabase
    .from("transactions")
    .update({ status: "disputed", updated_at: new Date().toISOString() })
    .eq("id", txId);

  // Notify buyer
  await sendMessage(token, chatId,
    `⚠️ *Dispute Raised*\n\n` +
    `Your dispute for "*${escapeMarkdown(listingTitle)}*" \\(${escapeMarkdown(price)}\\) has been recorded\\.\n\n` +
    `Our admin team will review this and reach out to both parties\\. Your funds remain protected in escrow\\.`,
    {
      inline_keyboard: [
        [{ text: "📞 Contact Support", url: "https://t.me/TrustPaySupport" }],
      ],
    }
  );

  // Notify seller
  const { data: buyer } = await supabase
    .from("bot_users")
    .select("first_name, username")
    .eq("telegram_id", buyerId)
    .single();

  const buyerName = buyer?.username ? `@${buyer.username}` : buyer?.first_name || "Buyer";

  await sendMessage(token, tx.seller_telegram_id,
    `⚠️ *Dispute Raised*\n\n` +
    `${escapeMarkdown(buyerName)} has raised a dispute for "*${escapeMarkdown(listingTitle)}*" \\(${escapeMarkdown(price)}\\)\\.\n\n` +
    `An admin will review this case\\. Please be prepared to provide evidence of delivery\\.`,
    {
      inline_keyboard: [
        [{ text: "📞 Contact Support", url: "https://t.me/TrustPaySupport" }],
      ],
    }
  );

  // Notify admin (LightOrb)
  const ADMIN_TELEGRAM_ID = 8316379364; // lightorbinnovations
  if (ADMIN_TELEGRAM_ID !== buyerId && ADMIN_TELEGRAM_ID !== tx.seller_telegram_id) {
    await sendMessage(token, ADMIN_TELEGRAM_ID,
      `🚨 *New Dispute\\!*\n\n` +
      `*Item:* ${escapeMarkdown(listingTitle)}\n` +
      `*Amount:* ${escapeMarkdown(price)}\n` +
      `*Buyer:* ${escapeMarkdown(buyerName)} \\(${buyerId}\\)\n` +
      `*Seller:* ${tx.seller_telegram_id}\n` +
      `*Transaction ID:* \`${txId}\``,
      null
    );
  }

  // Notifications
  await supabase.from("notifications").insert([
    {
      recipient_telegram_id: tx.seller_telegram_id,
      type: "escrow_disputed",
      title: "Dispute raised ⚠️",
      message: `${buyerName} raised a dispute for "${listingTitle}" (${price}). Admin will review.`,
      listing_id: tx.listings?.id || null,
      sender_telegram_id: buyerId,
    },
    {
      recipient_telegram_id: buyerId,
      type: "escrow_disputed",
      title: "Dispute recorded ⚠️",
      message: `Your dispute for "${listingTitle}" (${price}) has been recorded. Admin will review.`,
      listing_id: tx.listings?.id || null,
    },
  ]);
}

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

async function upsertUser(supabase: any, tgUser: any) {
  const { error } = await supabase.from("bot_users").upsert(
    {
      telegram_id: tgUser.id,
      first_name: tgUser.first_name || null,
      username: tgUser.username || null,
    },
    { onConflict: "telegram_id" }
  );
  if (error) console.error("Upsert error:", error);
}

async function sendWelcome(token: string, chatId: number, firstName: string) {
  const caption = `Hey *${escapeMarkdown(firstName)}*\\! 👋 Welcome to *TrustPay Markets*\n\n` +
    `🛡 *Your safe marketplace on Telegram*\n\n` +
    `Buy \\& sell products and services with escrow protection\\. ` +
    `Your payments are held securely until delivery is confirmed\\.\n\n` +
    `Tap a button below to get started 👇`;

  const keyboard = {
    inline_keyboard: [
      [{ text: "🛒 Open Marketplace", web_app: { url: `${MINI_APP_URL}/home` } }],
      [{ text: "📦 Post a Listing", web_app: { url: `${MINI_APP_URL}/post` } }],
      [
        { text: "👤 My Profile", web_app: { url: `${MINI_APP_URL}/profile` } },
        { text: "❓ Help", callback_data: "help" },
      ],
    ],
  };

  await fetch(`${TELEGRAM_API}${token}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      photo: BANNER_URL,
      caption,
      parse_mode: "MarkdownV2",
      reply_markup: keyboard,
    }),
  });
}

function helpText(): string {
  return `❓ *Help \\& FAQ*\n\n` +
    `*How does TrustPay work?*\n` +
    `1️⃣ Browse or post listings\n` +
    `2️⃣ Find something you like\n` +
    `3️⃣ Use TrustPay Escrow for safe payments\n` +
    `4️⃣ Payment is released after delivery confirmation\n\n` +
    `*Escrow Payment Flow:*\n` +
    `🔹 Buyer confirms payment → held in escrow\n` +
    `🔹 Seller delivers item/service\n` +
    `🔹 Buyer confirms receipt → funds released\n` +
    `🔹 Dispute? Admin reviews the case\n\n` +
    `*Boost your listing:*\n` +
    `Use Telegram Stars ⭐ to boost your listing to the top\\!\n` +
    `Go to My Listings → Tap Boost → Pay with Stars\n\n` +
    `*Commands:*\n` +
    `/start — Open the marketplace\n` +
    `/help — Show this help message\n` +
    `/mylistings — View your active listings\n\n` +
    `Need support? Contact @TrustPaySupport`;
}

function helpKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "🛒 Open Marketplace", web_app: { url: `${MINI_APP_URL}/home` } }],
    ],
  };
}

async function sendMyListings(token: string, supabase: any, chatId: number, telegramId: number) {
  const { data: listings, error } = await supabase
    .from("listings")
    .select("title, price, status, category, boosted_until")
    .eq("seller_telegram_id", telegramId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !listings || listings.length === 0) {
    const text = `📦 *Your Listings*\n\nYou don't have any active listings yet\\.\nTap below to create one\\!`;
    const keyboard = {
      inline_keyboard: [
        [{ text: "📦 Post a Listing", web_app: { url: `${MINI_APP_URL}/post` } }],
      ],
    };
    await sendMessage(token, chatId, text, keyboard);
    return;
  }

  let text = `📦 *Your Active Listings*\n\n`;
  const now = new Date();
  listings.forEach((l: any, i: number) => {
    const price = l.price != null ? `₦${Number(l.price).toLocaleString("en-NG")}` : "Free";
    const isBoosted = l.boosted_until && new Date(l.boosted_until) > now;
    text += `${i + 1}\\. ${isBoosted ? "🚀 " : ""}*${escapeMarkdown(l.title)}* — ${escapeMarkdown(price)}\n`;
    if (l.category) text += `   📂 ${escapeMarkdown(l.category)}\n`;
    if (isBoosted) text += `   ⭐ Boosted until ${escapeMarkdown(new Date(l.boosted_until).toLocaleDateString())}\n`;
  });
  text += `\n_Showing up to 10 active listings_`;

  const keyboard = {
    inline_keyboard: [
      [{ text: "📋 View All in App", web_app: { url: `${MINI_APP_URL}/profile/listings` } }],
      [{ text: "📦 Post New Listing", web_app: { url: `${MINI_APP_URL}/post` } }],
    ],
  };
  await sendMessage(token, chatId, text, keyboard);
}

async function sendMessage(token: string, chatId: number, text: string, replyMarkup: any) {
  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: "MarkdownV2",
  };
  if (replyMarkup) body.reply_markup = replyMarkup;

  await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function sendListingDeepLink(token: string, supabase: any, chatId: number, listingId: string) {
  const { data: listing, error } = await supabase
    .from("listings")
    .select("id, title, price, category, city, description, seller_telegram_id, status")
    .eq("id", listingId)
    .single();

  if (error || !listing) {
    await sendMessage(token, chatId, "😕 Listing not found or no longer available\\.", null);
    return;
  }

  const price = listing.price != null ? `₦${Number(listing.price).toLocaleString("en-NG")}` : "Free";
  const city = listing.city || "N/A";
  const category = listing.category || "General";
  const desc = listing.description
    ? escapeMarkdown(listing.description.substring(0, 200))
    : "No description";

  const text =
    `🛍 *${escapeMarkdown(listing.title)}*\n\n` +
    `💰 *Price:* ${escapeMarkdown(price)}\n` +
    `📂 *Category:* ${escapeMarkdown(category)}\n` +
    `📍 *Location:* ${escapeMarkdown(city)}\n` +
    `📌 *Status:* ${escapeMarkdown(listing.status)}\n\n` +
    `${desc}`;

  const keyboard = {
    inline_keyboard: [
      [{ text: "🔍 View in App", web_app: { url: `${MINI_APP_URL}/listing/${listing.id}` } }],
      [{ text: "🛡 Use Escrow", url: `https://t.me/TrustPay9jaBot?start=escrow_${listing.id}` }],
      [{ text: "🛒 Browse Marketplace", web_app: { url: `${MINI_APP_URL}/home` } }],
    ],
  };

  await sendMessage(token, chatId, text, keyboard);
}

function escapeMarkdown(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}
