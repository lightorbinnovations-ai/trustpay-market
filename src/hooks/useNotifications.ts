import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTelegramUser } from "@/hooks/useTelegramUser";

export function useNotifications() {
  const { user } = useTelegramUser();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_telegram_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: user.id !== 0,
  });

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;

  useEffect(() => {
    if (user.id === 0) return;

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_telegram_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id, queryClient]);

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("recipient_telegram_id", user.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId)
        .eq("recipient_telegram_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
    },
  });

  return { notifications, isLoading, unreadCount, markAsRead, markAllRead, deleteNotification };
}

/** Helper: send push notification via Telegram Bot */
async function sendPush(
  recipientTelegramId: number,
  title: string,
  message: string,
  listingId?: string
) {
  try {
    await supabase.functions.invoke("send-push", {
      body: {
        recipient_telegram_id: recipientTelegramId,
        title,
        message,
        listing_id: listingId || null,
      },
    });
  } catch {
    // Push failure shouldn't block in-app notification
  }
}

/** Insert notification + send push */
async function createNotification(params: {
  recipient_telegram_id: number;
  type: string;
  title: string;
  message: string;
  listing_id?: string;
  sender_telegram_id?: number;
}) {
  await supabase.from("notifications").insert({
    recipient_telegram_id: params.recipient_telegram_id,
    type: params.type,
    title: params.title,
    message: params.message,
    listing_id: params.listing_id || null,
    sender_telegram_id: params.sender_telegram_id || null,
  });

  // Fire-and-forget push
  sendPush(
    params.recipient_telegram_id,
    params.title,
    params.message,
    params.listing_id
  );
}

/** Send a notification to a seller when their listing is viewed */
export async function notifyListingView(
  listingId: string,
  listingTitle: string,
  sellerTelegramId: number,
  viewerName: string,
  viewerTelegramId: number
) {
  if (sellerTelegramId === viewerTelegramId) return;

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from("notifications")
    .select("id")
    .eq("recipient_telegram_id", sellerTelegramId)
    .eq("type", "listing_view")
    .eq("listing_id", listingId)
    .eq("sender_telegram_id", viewerTelegramId)
    .gte("created_at", oneHourAgo)
    .limit(1);

  if (existing && existing.length > 0) return;

  await createNotification({
    recipient_telegram_id: sellerTelegramId,
    type: "listing_view",
    title: "Listing viewed 👀",
    message: `${viewerName} viewed your listing "${listingTitle}"`,
    listing_id: listingId,
    sender_telegram_id: viewerTelegramId,
  });
}

/** Send a notification to a seller when someone favorites their listing */
export async function notifyFavorite(
  listingId: string,
  listingTitle: string,
  sellerTelegramId: number,
  buyerName: string,
  buyerUsername: string | undefined,
  buyerTelegramId: number
) {
  if (sellerTelegramId === buyerTelegramId) return;

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from("notifications")
    .select("id")
    .eq("recipient_telegram_id", sellerTelegramId)
    .eq("type", "favorite_added")
    .eq("listing_id", listingId)
    .eq("sender_telegram_id", buyerTelegramId)
    .gte("created_at", oneDayAgo)
    .limit(1);

  if (existing && existing.length > 0) return;

  const displayName = buyerUsername ? `@${buyerUsername}` : buyerName;
  await createNotification({
    recipient_telegram_id: sellerTelegramId,
    type: "favorite_added",
    title: "Someone saved your listing ❤️",
    message: `${displayName} saved your listing "${listingTitle}" to their favorites`,
    listing_id: listingId,
    sender_telegram_id: buyerTelegramId,
  });
}

/** Send a notification to a seller when a transaction is started */
export async function notifyTransactionStarted(
  listingId: string,
  listingTitle: string,
  sellerTelegramId: number,
  buyerName: string,
  buyerTelegramId: number,
  amount: number
) {
  const { formatNaira } = await import("@/lib/currency");

  await createNotification({
    recipient_telegram_id: sellerTelegramId,
    type: "transaction_started",
    title: "New escrow payment 💰",
    message: `${buyerName} started an escrow payment of ${formatNaira(amount)} for "${listingTitle}"`,
    listing_id: listingId,
    sender_telegram_id: buyerTelegramId,
  });
}

/** Send a welcome notification to a new user */
export async function notifyWelcome(telegramId: number, firstName: string) {
  const { data: existing } = await supabase
    .from("notifications")
    .select("id")
    .eq("recipient_telegram_id", telegramId)
    .eq("type", "welcome")
    .limit(1);

  if (existing && existing.length > 0) return;

  await createNotification({
    recipient_telegram_id: telegramId,
    type: "welcome",
    title: "Welcome to TrustPay Markets! 🎉",
    message: `Hi ${firstName}! You're all set to buy and sell securely. Post your first listing or explore what's available near you.`,
  });
}

/** Notify users in the same city about a new listing */
export async function notifyNewListingInCity(
  listingId: string,
  listingTitle: string,
  city: string,
  sellerTelegramId: number,
  sellerName: string
) {
  if (!city) return;

  // Find distinct users who have listings in the same city (active community members)
  const { data: cityUsers, error } = await supabase
    .from("listings")
    .select("seller_telegram_id")
    .eq("city", city)
    .neq("seller_telegram_id", sellerTelegramId);

  if (error || !cityUsers) return;

  // Deduplicate user IDs
  const uniqueIds = [...new Set(cityUsers.map((u) => u.seller_telegram_id))];

  // Limit to 20 users to avoid spam
  const recipients = uniqueIds.slice(0, 20);

  const { formatNaira } = await import("@/lib/currency");

  await Promise.all(
    recipients.map((recipientId) =>
      createNotification({
        recipient_telegram_id: recipientId,
        type: "new_listing_nearby",
        title: `New listing in ${city} 📍`,
        message: `${sellerName} just posted "${listingTitle}" in ${city}. Check it out!`,
        listing_id: listingId,
        sender_telegram_id: sellerTelegramId,
      })
    )
  );
}

/** Notify both parties when a transaction status changes (admin action) */
export async function notifyTransactionStatusChange(
  transactionId: string,
  newStatus: string,
  buyerTelegramId: number,
  sellerTelegramId: number,
  listingTitle: string,
  amount: number
) {
  const { formatNaira } = await import("@/lib/currency");
  const formattedAmount = formatNaira(amount);

  const statusMessages: Record<string, { title: string; buyerMsg: string; sellerMsg: string }> = {
    paid: {
      title: "Payment confirmed 💰",
      buyerMsg: `Your payment of ${formattedAmount} for "${listingTitle}" is now in escrow.`,
      sellerMsg: `Buyer has paid ${formattedAmount} for "${listingTitle}". Proceed with delivery!`,
    },
    released: {
      title: "Payment released ✅",
      buyerMsg: `Payment of ${formattedAmount} for "${listingTitle}" has been released to the seller. Transaction complete!`,
      sellerMsg: `You've received ${formattedAmount} for "${listingTitle}". Transaction complete! 🎉`,
    },
    disputed: {
      title: "Transaction disputed ⚠️",
      buyerMsg: `Your transaction for "${listingTitle}" (${formattedAmount}) is under review.`,
      sellerMsg: `A dispute was raised on "${listingTitle}" (${formattedAmount}). Admin is reviewing.`,
    },
    refunded: {
      title: "Payment refunded 💸",
      buyerMsg: `Your payment of ${formattedAmount} for "${listingTitle}" has been refunded.`,
      sellerMsg: `The payment of ${formattedAmount} for "${listingTitle}" has been refunded to the buyer.`,
    },
  };

  const msgs = statusMessages[newStatus];
  if (!msgs) return;

  await Promise.all([
    createNotification({
      recipient_telegram_id: buyerTelegramId,
      type: `transaction_${newStatus}`,
      title: msgs.title,
      message: msgs.buyerMsg,
      sender_telegram_id: sellerTelegramId,
    }),
    createNotification({
      recipient_telegram_id: sellerTelegramId,
      type: `transaction_${newStatus}`,
      title: msgs.title,
      message: msgs.sellerMsg,
      sender_telegram_id: buyerTelegramId,
    }),
  ]);
}

/** Notify seller (and admin) when their boost expires */
export async function notifyBoostExpired(
  listingId: string,
  listingTitle: string,
  sellerTelegramId: number,
  adminTelegramId?: number
) {
  await createNotification({
    recipient_telegram_id: sellerTelegramId,
    type: "boost_activated",
    title: "Boost expired 🚀",
    message: `Your boost for "${listingTitle}" has expired. Re-boost to maintain visibility!`,
    listing_id: listingId,
  });

  if (adminTelegramId && adminTelegramId !== sellerTelegramId) {
    await createNotification({
      recipient_telegram_id: adminTelegramId,
      type: "boost_activated",
      title: "Boost expired (Admin) 🚀",
      message: `Boost expired for "${listingTitle}" (seller: ${sellerTelegramId})`,
      listing_id: listingId,
    });
  }
}
