import { useTelegramUser } from "@/hooks/useTelegramUser";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAdmin() {
  const { user } = useTelegramUser();

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user.id],
    queryFn: async () => {
      if (user.id === 0) return false;
      const { data, error } = await supabase
        .from("bot_users")
        .select("is_admin")
        .eq("telegram_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error checking admin status:", error);
        return false;
      }
      return !!data?.is_admin;
    },
    enabled: user.id !== 0,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return { isAdmin: !!isAdmin };
}
