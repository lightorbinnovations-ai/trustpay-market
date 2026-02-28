
-- Add foreign key from reviews.reviewer_telegram_id to bot_users.telegram_id
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_reviewer_telegram_id_fkey
  FOREIGN KEY (reviewer_telegram_id) REFERENCES public.bot_users(telegram_id);

-- Add foreign key from reviews.seller_telegram_id to bot_users.telegram_id  
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_seller_telegram_id_fkey
  FOREIGN KEY (seller_telegram_id) REFERENCES public.bot_users(telegram_id);
