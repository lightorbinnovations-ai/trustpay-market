-- Add analytics and multi-image support to ads table
ALTER TABLE public.ads 
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS clicks_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS image_paths TEXT[] DEFAULT '{}';

-- Migration to ensure every existing ad has an empty array if image_paths is null (though default handles it)
UPDATE public.ads SET image_paths = '{}' WHERE image_paths IS NULL;
