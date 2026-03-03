-- Create escrow_tokens table in Market project
CREATE TABLE IF NOT EXISTS public.escrow_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT NOT NULL UNIQUE,
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    buyer_id BIGINT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_escrow_tokens_token ON public.escrow_tokens(token);

-- Enable RLS
ALTER TABLE public.escrow_tokens ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (from Market app)
CREATE POLICY "Allow anonymous inserts" ON public.escrow_tokens
    FOR INSERT WITH CHECK (true);

-- Allow anonymous selects/updates (from Escrow app using marketSupabase client)
CREATE POLICY "Allow anonymous select and update" ON public.escrow_tokens
    FOR ALL USING (true) WITH CHECK (true);
