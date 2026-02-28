
-- Create ads table
CREATE TABLE public.ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_telegram_id BIGINT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_path TEXT,
  video_path TEXT,
  link_url TEXT,
  duration_days INTEGER NOT NULL DEFAULT 1,
  stars_paid INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active ads"
  ON public.ads FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert ads"
  ON public.ads FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Owners can update own ads"
  ON public.ads FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Owners can delete own ads"
  ON public.ads FOR DELETE
  USING (true);

-- Enable realtime for ads
ALTER PUBLICATION supabase_realtime ADD TABLE public.ads;
