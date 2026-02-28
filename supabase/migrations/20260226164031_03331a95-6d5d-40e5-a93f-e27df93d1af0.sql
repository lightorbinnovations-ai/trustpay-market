
-- Add lat/lng to listings for proximity sorting
ALTER TABLE public.listings
  ADD COLUMN latitude DOUBLE PRECISION,
  ADD COLUMN longitude DOUBLE PRECISION;

-- Add lat/lng to bot_users for caching user location
ALTER TABLE public.bot_users
  ADD COLUMN latitude DOUBLE PRECISION,
  ADD COLUMN longitude DOUBLE PRECISION;
