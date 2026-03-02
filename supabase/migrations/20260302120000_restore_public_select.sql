-- Fix: Restore public SELECT policies that were inadvertently dropped
-- by the privacy lockdown migration (20260302110000_privacy_lockdown.sql).
-- 
-- bot_users: Needed by the Escrow app's cross-project lookup to 
-- resolve seller usernames when deep linking from Market listings.
-- This table only contains telegram_id, username, first_name — no sensitive data.

CREATE POLICY "Public can read bot_users" 
  ON public.bot_users FOR SELECT 
  USING (true);
