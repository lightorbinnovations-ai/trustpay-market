-- RPC for incrementing ad views
CREATE OR REPLACE FUNCTION public.increment_ad_views(ad_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.ads
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = ad_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC for incrementing ad clicks
CREATE OR REPLACE FUNCTION public.increment_ad_clicks(ad_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.ads
  SET clicks_count = COALESCE(clicks_count, 0) + 1
  WHERE id = ad_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
