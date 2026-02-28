
-- Transactions table for escrow history
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  buyer_telegram_id BIGINT NOT NULL REFERENCES public.bot_users(telegram_id),
  seller_telegram_id BIGINT NOT NULL REFERENCES public.bot_users(telegram_id),
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Public read on listings
CREATE POLICY "Anyone can read listings" ON public.listings FOR SELECT USING (true);

-- Public read on bot_users (for seller info)
CREATE POLICY "Anyone can read bot_users" ON public.bot_users FOR SELECT USING (true);

-- Public read on transactions (filtered in app by telegram_id)
CREATE POLICY "Anyone can read transactions" ON public.transactions FOR SELECT USING (true);

-- Storage bucket for listing images
INSERT INTO storage.buckets (id, name, public) VALUES ('listing-images', 'listing-images', true);

-- Public read on listing images
CREATE POLICY "Anyone can view listing images" ON storage.objects FOR SELECT USING (bucket_id = 'listing-images');

-- Anyone can upload listing images (Telegram app has no Supabase auth)
CREATE POLICY "Anyone can upload listing images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'listing-images');
