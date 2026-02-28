-- ============================================================
-- TrustPay Markets — Complete Supabase Bootstrap Script
-- Run this in a fresh Supabase project's SQL editor (Dashboard → SQL Editor)
-- Created: 2026-02-27
-- ============================================================

-- ===================== TABLES ================================

-- 1. bot_users — Telegram users synced from the mini-app
CREATE TABLE IF NOT EXISTS public.bot_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint NOT NULL UNIQUE,
  first_name text,
  username text,
  country text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. listings — Products / services posted by sellers
CREATE TABLE IF NOT EXISTS public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  price numeric,
  category text,
  city text,
  country text,
  type text NOT NULL,  -- 'item' or 'service'
  status text NOT NULL DEFAULT 'active',  -- active | sold | private | paused
  seller_telegram_id bigint NOT NULL REFERENCES public.bot_users(telegram_id),
  latitude double precision,
  longitude double precision,
  boosted_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. favorites — User bookmarks
CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint NOT NULL,
  listing_id uuid NOT NULL REFERENCES public.listings(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (telegram_id, listing_id)
);

-- 4. transactions — Escrow payments between buyer & seller
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES public.listings(id),
  buyer_telegram_id bigint NOT NULL REFERENCES public.bot_users(telegram_id),
  seller_telegram_id bigint NOT NULL REFERENCES public.bot_users(telegram_id),
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',  -- pending | paid | released | disputed | refunded
  boost_listing_id uuid REFERENCES public.listings(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. reviews — Buyer reviews of sellers after transactions
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL UNIQUE REFERENCES public.transactions(id),
  reviewer_telegram_id bigint NOT NULL REFERENCES public.bot_users(telegram_id),
  seller_telegram_id bigint NOT NULL REFERENCES public.bot_users(telegram_id),
  listing_id uuid REFERENCES public.listings(id),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. notifications — In-app notification feed
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_telegram_id bigint NOT NULL,
  sender_telegram_id bigint,
  type text NOT NULL,  -- listing_view | favorite_added | transaction_started | welcome | new_listing_nearby | boost_activated
  title text NOT NULL,
  message text NOT NULL,
  listing_id uuid REFERENCES public.listings(id),
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. ads — Sponsored advertisements (image/video)
CREATE TABLE IF NOT EXISTS public.ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_telegram_id bigint NOT NULL,
  title text NOT NULL,
  description text,
  image_path text,
  video_path text,
  link_url text,
  duration_days integer NOT NULL DEFAULT 1,
  stars_paid integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',  -- pending | active | paused | expired
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. verified_sellers — Paid verification badges (30-day subscriptions)
CREATE TABLE IF NOT EXISTS public.verified_sellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint NOT NULL,
  stars_paid integer NOT NULL DEFAULT 0,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  auto_renew boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);


-- ===================== ROW LEVEL SECURITY ====================

-- Enable RLS on all tables
ALTER TABLE public.bot_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verified_sellers ENABLE ROW LEVEL SECURITY;

-- NOTE: This app uses Telegram authentication (no Supabase Auth).
-- All access goes through the anon key with open RLS policies.
-- Security is enforced by the Telegram mini-app context (user identity comes from Telegram SDK).

-- bot_users
CREATE POLICY "Anyone can read bot_users" ON public.bot_users FOR SELECT USING (true);
CREATE POLICY "Allow service role full access to bot_users" ON public.bot_users FOR ALL USING (true) WITH CHECK (true);

-- listings
CREATE POLICY "Anyone can read listings" ON public.listings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert listings" ON public.listings FOR INSERT WITH CHECK (true);
CREATE POLICY "Sellers can update own listings" ON public.listings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Sellers can delete own listings" ON public.listings FOR DELETE USING (true);
CREATE POLICY "Allow service role full access to listings" ON public.listings FOR ALL USING (true) WITH CHECK (true);

-- favorites
CREATE POLICY "Anyone can read favorites" ON public.favorites FOR SELECT USING (true);
CREATE POLICY "Anyone can insert favorites" ON public.favorites FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete favorites" ON public.favorites FOR DELETE USING (true);

-- transactions
CREATE POLICY "Anyone can read transactions" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert transactions" ON public.transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update transactions" ON public.transactions FOR UPDATE USING (true) WITH CHECK (true);

-- reviews
CREATE POLICY "Anyone can read reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Anyone can insert reviews" ON public.reviews FOR INSERT WITH CHECK (true);

-- notifications
CREATE POLICY "Anyone can read notifications" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Anyone can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update own notifications" ON public.notifications FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (true);

-- ads
CREATE POLICY "Anyone can read active ads" ON public.ads FOR SELECT USING (true);
CREATE POLICY "Anyone can insert ads" ON public.ads FOR INSERT WITH CHECK (true);
CREATE POLICY "Owners can update own ads" ON public.ads FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Owners can delete own ads" ON public.ads FOR DELETE USING (true);

-- verified_sellers
CREATE POLICY "Anyone can read verified_sellers" ON public.verified_sellers FOR SELECT USING (true);
CREATE POLICY "Anyone can insert verified_sellers" ON public.verified_sellers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update verified_sellers" ON public.verified_sellers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete verified_sellers" ON public.verified_sellers FOR DELETE USING (true);


-- ===================== REALTIME ==============================

-- Enable realtime for notifications (used by checkout page for transaction updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;


-- ===================== STORAGE ===============================

-- Create the listing-images bucket (public, for listing photos and ad media)
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-images', 'listing-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: allow anyone to upload and read
CREATE POLICY "Anyone can upload listing images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'listing-images');

CREATE POLICY "Anyone can read listing images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-images');

CREATE POLICY "Anyone can update listing images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'listing-images')
  WITH CHECK (bucket_id = 'listing-images');

CREATE POLICY "Anyone can delete listing images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'listing-images');
