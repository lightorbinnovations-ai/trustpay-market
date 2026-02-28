import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

const FALLBACK_USER: TelegramUser = {
  id: 0,
  first_name: "Guest",
};

const USER_CACHE_KEY = "trustpay_telegram_user";

const getCachedUser = (): TelegramUser | null => {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TelegramUser;
    if (parsed?.id && parsed.id !== 0 && parsed?.first_name) return parsed;
    return null;
  } catch {
    return null;
  }
};

const cacheUser = (user: TelegramUser) => {
  try {
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
  } catch {
    // no-op
  }
};

const getTelegramUser = (): TelegramUser | null => {
  try {
    const tg = (window as any).Telegram?.WebApp;

    const unsafeUser = tg?.initDataUnsafe?.user;
    if (unsafeUser?.id && unsafeUser?.first_name) {
      return unsafeUser as TelegramUser;
    }

    const initData = tg?.initData as string | undefined;
    if (initData) {
      const params = new URLSearchParams(initData);
      const userRaw = params.get("user");
      if (userRaw) {
        const parsed = JSON.parse(userRaw) as TelegramUser;
        if (parsed?.id && parsed?.first_name) return parsed;
      }
    }

    return null;
  } catch {
    return null;
  }
};

const WELCOME_SENT_KEY = "trustpay_welcome_sent";

/** Upsert user into bot_users table so their username & name are always current */
const syncUserToDb = async (user: TelegramUser, isNew: boolean) => {
  try {
    await supabase.from("bot_users").upsert(
      {
        telegram_id: user.id,
        first_name: user.first_name,
        username: user.username ?? null,
      },
      { onConflict: "telegram_id" }
    );

    // Send welcome notification for first-time users — guarded by localStorage to prevent duplicates
    if (isNew && !localStorage.getItem(WELCOME_SENT_KEY)) {
      localStorage.setItem(WELCOME_SENT_KEY, "true");
      const { notifyWelcome } = await import("@/hooks/useNotifications");
      await notifyWelcome(user.id, user.first_name);
    }
  } catch {
    // no-op
  }
};

export function useTelegramUser() {
  const [user, setUser] = useState<TelegramUser>(() => getCachedUser() ?? FALLBACK_USER);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Try to expand Telegram WebApp
    try {
      const tg = (window as any).Telegram?.WebApp;
      tg?.expand?.();
      tg?.ready?.();
    } catch {
      // no-op
    }

    // Check if we already have a cached valid user
    const cached = getCachedUser();
    if (cached) {
      setUser(cached);
      setIsReady(true);
      syncUserToDb(cached, false);
    }

    const visited = localStorage.getItem("trustpay_visited");
    let attempts = 0;
    const maxAttempts = 15;
    const interval = window.setInterval(() => {
      attempts += 1;
      const tgUser = getTelegramUser();
      if (tgUser) {
        setUser(tgUser);
        cacheUser(tgUser);
        setIsReady(true);
        syncUserToDb(tgUser, !visited);
        window.clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        // After all retries, mark ready (will show guest/prompt)
        setIsReady(true);
        window.clearInterval(interval);
      }
    }, 300);

    setIsFirstTime(!visited);

    return () => window.clearInterval(interval);
  }, []);

  const isGuest = user.id === 0;

  const markVisited = () => {
    localStorage.setItem("trustpay_visited", "true");
    setIsFirstTime(false);
  };

  return { user, isFirstTime, markVisited, isGuest, isReady };
}

export function triggerHaptic(type: "light" | "medium" | "heavy" = "light") {
  try {
    const tg = (window as any).Telegram?.WebApp;
    tg?.HapticFeedback?.impactOccurred(type);
  } catch {
    // no-op
  }
}
