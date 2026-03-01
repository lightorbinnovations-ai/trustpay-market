import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import https from "https";

const supabaseUrl = "https://iqvkbmaiojuxzygscirc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxdmtibWFpb2p1eHp5Z3NjaXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzQ1MjIsImV4cCI6MjA4Nzg1MDUyMn0.SpB92Iljf05D3zjyY0_Ew10rO-hgQOZN7zmDark20mY";

const supabase = createClient(supabaseUrl, supabaseKey);

async function downloadImage(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            // follow redirects
            if (response.statusCode === 301 || response.statusCode === 302) {
                return downloadImage(response.headers.location).then(resolve).catch(reject);
            }

            const data = [];
            response.on("data", (chunk) => data.push(chunk));
            response.on("end", () => resolve(Buffer.concat(data)));
            response.on("error", reject);
        }).on("error", reject);
    });
}

async function seedImages() {
    console.log("Fetching listings without images...");

    const { data: listings, error } = await supabase.from("listings").select("id, title, category").limit(30);
    if (error) {
        console.error("Error fetching listings:", error);
        return;
    }

    console.log(`Found ${listings.length} listings. Attaching images...`);

    for (let i = 0; i < listings.length; i++) {
        const listing = listings[i];
        console.log(`Processing listing ${i + 1}/${listings.length}: ${listing.title}`);

        try {
            // Pick a random image from picsum for variety
            const imageUrl = `https://picsum.photos/seed/${listing.id}/600/400`;
            const imageBuffer = await downloadImage(imageUrl);

            const fileName = `${Date.now()}-seed.jpg`;
            const path = `listings/${listing.id}/${fileName}`;

            const { error: uploadErr } = await supabase.storage
                .from("listing-images")
                .upload(path, imageBuffer, {
                    contentType: "image/jpeg",
                    upsert: true
                });

            if (uploadErr) {
                console.error(`  -> Failed to upload image for ${listing.id}:`, uploadErr.message);
            } else {
                console.log(`  -> Uploaded image for ${listing.id}`);
            }

            // Delay slightly to avoid rate limits
            await new Promise(r => setTimeout(r, 500));
        } catch (err) {
            console.error(`  -> Error processing ${listing.id}:`, err.message);
        }
    }

    // Now handle Ads
    const { data: ads, error: adsError } = await supabase.from("ads").select("id, title").limit(10);
    if (adsError) {
        console.error("Error fetching ads:", adsError);
    } else if (ads && ads.length > 0) {
        console.log(`Found ${ads.length} ads. Attaching images...`);
        for (let i = 0; i < ads.length; i++) {
            const ad = ads[i];
            console.log(`Processing ad ${i + 1}/${ads.length}: ${ad.title}`);
            try {
                const imageUrl = `https://picsum.photos/seed/${ad.id}/800/400`;
                const imageBuffer = await downloadImage(imageUrl);
                const fileName = `${Date.now()}-ad-seed.jpg`;
                const path = `ads/${ad.id}/${fileName}`;

                const { error: uploadErr } = await supabase.storage.from("listing-images").upload(path, imageBuffer, { contentType: "image/jpeg", upsert: true });

                if (!uploadErr) {
                    // Update ad with image_path
                    await supabase.from("ads").update({ image_path: path }).eq("id", ad.id);
                    console.log(`  -> Uploaded image for ad ${ad.id}`);
                }
                await new Promise(r => setTimeout(r, 500));
            } catch (err) {
                console.error(`  -> Error processing ad ${ad.id}:`, err.message);
            }
        }
    }

    console.log("Image seeding complete!");
}

seedImages();
