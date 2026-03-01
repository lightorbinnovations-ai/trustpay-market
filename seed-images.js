import { createClient } from "@supabase/supabase-js";
import https from "https";

const supabaseUrl = "https://iqvkbmaiojuxzygscirc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxdmtibWFpb2p1eHp5Z3NjaXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzQ1MjIsImV4cCI6MjA4Nzg1MDUyMn0.SpB92Iljf05D3zjyY0_Ew10rO-hgQOZN7zmDark20mY";

const supabase = createClient(supabaseUrl, supabaseKey);

async function downloadImage(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
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
    console.log("Fetching listings...");
    const { data: listings } = await supabase.from("listings").select("id, title").limit(60);
    console.log(`Found ${listings.length} listings. Attaching images...`);

    for (const listing of listings) {
        try {
            const imageUrl = `https://picsum.photos/seed/${listing.id}/600/400`;
            const imageBuffer = await downloadImage(imageUrl);
            const fileName = `${Date.now()}-seed.jpg`;
            const path = `listings/${listing.id}/${fileName}`;

            const { error: uploadErr } = await supabase.storage.from("listing-images").upload(path, imageBuffer, { contentType: "image/jpeg", upsert: true });
            if (uploadErr) console.error(`Failed ${listing.id}:`, uploadErr.message);
            else console.log(`Uploaded listing ${listing.id}`);
            await new Promise(r => setTimeout(r, 300));
        } catch (err) { console.error(`Error ${listing.id}:`, err.message); }
    }

    const { data: ads } = await supabase.from("ads").select("id, title").limit(20);
    console.log(`Found ${ads.length} ads. Attaching images...`);
    for (const ad of ads) {
        try {
            const imageUrl = `https://picsum.photos/seed/${ad.id}/800/400`;
            const imageBuffer = await downloadImage(imageUrl);
            const fileName = `${Date.now()}-ad.jpg`;
            const path = `ads/${ad.id}/${fileName}`;
            const { error: uploadErr } = await supabase.storage.from("listing-images").upload(path, imageBuffer, { contentType: "image/jpeg", upsert: true });
            if (!uploadErr) {
                const { data: urlData } = supabase.storage.from("listing-images").getPublicUrl(path);
                await supabase.from("ads").update({ image_path: urlData.publicUrl }).eq("id", ad.id);
                console.log(`Uploaded & Linked ad ${ad.id}`);
            }
            await new Promise(r => setTimeout(r, 300));
        } catch (err) { console.error(`Error ad ${ad.id}:`, err.message); }
    }
    console.log("Image seeding complete!");
}

seedImages();
