
-- Allow anyone to insert transactions (Telegram-based auth, no Supabase auth)
CREATE POLICY "Anyone can insert transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (true);
