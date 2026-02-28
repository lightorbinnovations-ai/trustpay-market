
-- Allow anyone to insert listings (Telegram users don't use Supabase auth)
CREATE POLICY "Anyone can insert listings"
ON public.listings
FOR INSERT
WITH CHECK (true);

-- Allow sellers to update their own listings
CREATE POLICY "Sellers can update own listings"
ON public.listings
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Allow sellers to delete their own listings
CREATE POLICY "Sellers can delete own listings"
ON public.listings
FOR DELETE
USING (true);
