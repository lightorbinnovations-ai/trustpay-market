import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const listingId = url.searchParams.get("id");

  if (!listingId) {
    return new Response("Missing listing id", { status: 400, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch listing
  const { data: listing, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", listingId)
    .single();

  if (error || !listing) {
    return new Response("Listing not found", { status: 404, headers: corsHeaders });
  }

  // Get first image
  let imageUrl = `${supabaseUrl}/storage/v1/object/public/listing-images/listings/${listingId}`;
  const { data: files } = await supabase.storage
    .from("listing-images")
    .list(`listings/${listingId}`, { limit: 1, sortBy: { column: "created_at", order: "asc" } });

  if (files && files.length > 0) {
    const file = files.find((f: any) => f.name !== ".emptyFolderPlaceholder");
    if (file) {
      const { data: urlData } = supabase.storage
        .from("listing-images")
        .getPublicUrl(`listings/${listingId}/${file.name}`);
      imageUrl = urlData.publicUrl;
    }
  }

  const price = listing.price
    ? `₦${Number(listing.price).toLocaleString("en-NG")}`
    : "Contact for price";
  const description = listing.description
    ? listing.description.slice(0, 150)
    : `${listing.category || "Item"} available on TrustPay Markets`;
  const title = `${listing.title} - ${price}`;
  const appUrl = `https://t.me/TrustPayMarketsBot?start=listing_${listingId}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta property="og:image:width" content="600" />
  <meta property="og:image:height" content="400" />
  <meta property="og:type" content="product" />
  <meta property="og:url" content="${escapeHtml(appUrl)}" />
  <meta property="og:site_name" content="TrustPay Markets" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(appUrl)}" />
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(appUrl)}">TrustPay Markets</a>...</p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
