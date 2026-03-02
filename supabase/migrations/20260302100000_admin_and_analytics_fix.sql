-- Add is_admin column to bot_users if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bot_users' AND column_name='is_admin') THEN
        ALTER TABLE public.bot_users ADD COLUMN is_admin BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Create an RPC for atomic ad view increments to prevent race conditions
CREATE OR REPLACE FUNCTION public.increment_ad_views(ad_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.ads
    SET views_count = views_count + 1
    WHERE id = ad_id;
END;
$$;

-- Create an RPC for atomic ad click increments
CREATE OR REPLACE FUNCTION public.increment_ad_clicks(ad_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.ads
    SET clicks_count = clicks_count + 1
    WHERE id = ad_id;
END;
$$;
