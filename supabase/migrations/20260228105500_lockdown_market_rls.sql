-- Phase 2: Security Overhaul - Lockdown RLS Policies for TrustPay Market
-- Revoke all direct client insert, update, and delete access.
-- Read access (SELECT) is maintained so the app can fetch data.
-- All writes must now go through Edge Functions using the service_role key.

-- 1. LISTINGS
DROP POLICY IF EXISTS "Users can insert their own listings" ON public.listings;
DROP POLICY IF EXISTS "Users can update their own listings" ON public.listings;
DROP POLICY IF EXISTS "Users can delete their own listings" ON public.listings;

-- 2. ADS
DROP POLICY IF EXISTS "Users can create ads" ON public.ads;
DROP POLICY IF EXISTS "Users can update their own ads" ON public.ads;
DROP POLICY IF EXISTS "Users can delete their own ads" ON public.ads;

-- 3. FAVORITES
DROP POLICY IF EXISTS "Users can add favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can remove their own favorites" ON public.favorites;

-- 4. TRANSACTIONS
DROP POLICY IF EXISTS "Users can create transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;

-- 5. REVIEWS
DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;

-- 6. NOTIFICATIONS
DROP POLICY IF EXISTS "Users can create notifications for themselves" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

-- 7. USERS (bot_users table equivalent in market app)
-- Ensure users cannot arbitrarily alter their bot_users profile via the browser.
DROP POLICY IF EXISTS "Users can insert themselves" ON public.bot_users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.bot_users;

-- Keep all SELECT policies active (Assuming policies like "Everyone can view listings" are already in place and correct).
