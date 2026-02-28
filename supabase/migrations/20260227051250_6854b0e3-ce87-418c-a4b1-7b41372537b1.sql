
-- Allow anyone to update transactions (needed for escrow status changes from edge functions)
CREATE POLICY "Anyone can update transactions"
  ON public.transactions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
