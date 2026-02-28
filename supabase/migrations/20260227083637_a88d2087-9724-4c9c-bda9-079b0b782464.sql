
CREATE TABLE public.verified_sellers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  stars_paid INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  auto_renew BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_verified_seller UNIQUE (telegram_id)
);

ALTER TABLE public.verified_sellers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read verified_sellers"
  ON public.verified_sellers FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert verified_sellers"
  ON public.verified_sellers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update verified_sellers"
  ON public.verified_sellers FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete verified_sellers"
  ON public.verified_sellers FOR DELETE
  USING (true);
