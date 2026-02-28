-- Add boosted_until column to listings for priority placement
ALTER TABLE public.listings
ADD COLUMN boosted_until timestamp with time zone DEFAULT NULL;

-- Index for efficient querying of boosted listings
CREATE INDEX idx_listings_boosted_until ON public.listings (boosted_until DESC NULLS LAST);

-- Add boost_amount to transactions to track boost payments
ALTER TABLE public.transactions
ADD COLUMN boost_listing_id uuid DEFAULT NULL REFERENCES public.listings(id);
