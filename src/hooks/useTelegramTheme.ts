import { useEffect } from "react";

/**
 * Auto-detects Telegram's theme (light/dark) and applies the
 * corresponding class to the document root.
 */
export function useTelegramTheme() {
  useEffect(() => {
    const applyTheme = () => {
      try {
        const tg = (window as any).Telegram?.WebApp;
        if (tg?.colorScheme) {
          document.documentElement.classList.toggle("dark", tg.colorScheme === "dark");
          return;
        }
      } catch {}

      // Fallback: respect OS preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.toggle("dark", prefersDark);
    };

    applyTheme();

    // Listen for Telegram theme changes
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg) {
        tg.onEvent?.("themeChanged", applyTheme);
        return () => tg.offEvent?.("themeChanged", applyTheme);
      }
    } catch {}

    // Fallback: listen for OS changes
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", applyTheme);
    return () => mq.removeEventListener("change", applyTheme);
  }, []);
}
