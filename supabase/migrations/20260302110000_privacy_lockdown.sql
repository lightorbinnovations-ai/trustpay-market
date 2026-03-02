-- Revoke public SELECT access for sensitive tables
-- This ensures that private data cannot be scraped by an unauthenticated client.

-- 1. Private User Data (Market)
DROP POLICY IF EXISTS "Anyone can read bot_users" ON public.bot_users;
ALTER TABLE public.bot_users ENABLE ROW LEVEL SECURITY;
-- No public SELECT policy = restricted to Service Role (Edge Functions)

-- 2. Transactions & Orders (Market)
DROP POLICY IF EXISTS "Anyone can read transactions" ON public.transactions;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 3. Notifications (Market)
DROP POLICY IF EXISTS "Anyone can read notifications" ON public.notifications;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Important: Public content like 'listings' (Market) and 'ads' (Market) 
-- should still be readable by everyone so they can be browsed.
