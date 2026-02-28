
-- Add country column to bot_users
ALTER TABLE public.bot_users ADD COLUMN IF NOT EXISTS country TEXT;

-- Add country column to listings
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS country TEXT;
