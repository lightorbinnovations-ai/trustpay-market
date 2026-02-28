
-- Users table for Telegram bot users
CREATE TABLE public.bot_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Listings table for marketplace items/services
CREATE TABLE public.listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_telegram_id BIGINT NOT NULL REFERENCES public.bot_users(telegram_id),
  type TEXT NOT NULL CHECK (type IN ('service', 'item')),
  category TEXT,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2),
  city TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bot_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Public read policies (edge function uses service role key)
CREATE POLICY "Allow service role full access to bot_users" ON public.bot_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access to listings" ON public.listings FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_listings_seller ON public.listings(seller_telegram_id);
CREATE INDEX idx_listings_type ON public.listings(type);
CREATE INDEX idx_listings_status ON public.listings(status);
