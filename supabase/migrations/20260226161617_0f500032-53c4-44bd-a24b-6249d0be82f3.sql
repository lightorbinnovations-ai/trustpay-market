
-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_telegram_id BIGINT NOT NULL,
  type TEXT NOT NULL, -- 'listing_view', 'transaction_started'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  sender_telegram_id BIGINT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Anyone can read notifications (filtered by telegram_id in app)
CREATE POLICY "Anyone can read notifications"
  ON public.notifications FOR SELECT
  USING (true);

-- Anyone can insert notifications (views/transactions create them)
CREATE POLICY "Anyone can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Anyone can update notifications (mark as read)
CREATE POLICY "Anyone can update own notifications"
  ON public.notifications FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Index for fast lookups
CREATE INDEX idx_notifications_recipient ON public.notifications (recipient_telegram_id, is_read, created_at DESC);
