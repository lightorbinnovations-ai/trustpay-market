import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://iqvkbmaiojuxzygscirc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxdmtibWFpb2p1eHp5Z3NjaXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzQ1MjIsImV4cCI6MjA4Nzg1MDUyMn0.SpB92Iljf05D3zjyY0_Ew10rO-hgQOZN7zmDark20mY";

const supabase = createClient(supabaseUrl, supabaseKey);

const categories = ["Gadgets", "Fashion", "Food & Beverages", "Beauty & Wellness", "Repairs", "Electrical", "Cleaning"];
const cities = ["Lagos", "Abuja", "Port Harcourt", "Kano", "Ibadan"];
const types = ["item", "service"];

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seed() {
    console.log("Starting DB seeding...");

    // Get some users from bot_users
    const { data: users, error: userError } = await supabase.from("bot_users").select("telegram_id, username").limit(5);
    if (userError || !users?.length) {
        console.error("Could not find users in 'bot_users'. Error:", userError);
        console.log("Attempting to create a dummy user first...");
        const dummyId = 99999999;
        const { error: insError } = await supabase.from("bot_users").insert({
            telegram_id: dummyId,
            username: "qa_tester",
            first_name: "QA",
            country: "Nigeria"
        });
        if (insError) {
            console.error("Failed to create dummy user:", insError);
            return;
        }
        users.push({ telegram_id: dummyId, username: "qa_tester" });
    }

    const sellerId = users[0].telegram_id;
    const buyerId = users[users.length - 1].telegram_id;

    console.log(`Using Seller ID: ${sellerId}`);
    console.log(`Using Buyer ID: ${buyerId}`);

    // Clean up existing QA items
    console.log("Cleaning up old QA data...");
    await supabase.from("listings").delete().like("title", "QA Premium%");
    await supabase.from("ads").delete().like("title", "Premium Sponsor Ad%");

    // 1. Create Listings
    console.log("Creating 30 listings...");
    const listingRows = [];
    for (let i = 1; i <= 30; i++) {
        const cat = categories[i % categories.length];
        const type = types[i % types.length];
        const city = cities[i % cities.length];
        listingRows.push({
            title: `QA Premium ${cat} Item #${i}`,
            description: `This is a high-quality ${type} in the ${cat} category, located in ${city}. Perfect for robust QA testing.`,
            price: randInt(5000, 500000),
            category: cat,
            type: type,
            city: city,
            country: "Nigeria",
            seller_telegram_id: sellerId,
            status: "active",
            boosted_until: (i % 5 === 0) ? new Date(Date.now() + 86400000 * 7).toISOString() : null
        });
    }

    const { data: insertedListings, error: lError } = await supabase.from("listings").insert(listingRows).select();
    if (lError) {
        console.error("Listings insert failed:", lError);
        return;
    }
    console.log(`Inserted ${insertedListings.length} listings.`);

    // 2. Create Transactions
    console.log("Creating 20 transactions...");
    const statuses = ["pending", "paid", "released", "disputed", "refunded"];
    const transactions = [];
    for (let i = 0; i < 20; i++) {
        const listing = insertedListings[i % insertedListings.length];
        transactions.push({
            listing_id: listing.id,
            buyer_telegram_id: buyerId,
            seller_telegram_id: sellerId,
            amount: listing.price,
            status: statuses[i % statuses.length]
        });
    }
    const { error: tError } = await supabase.from("transactions").insert(transactions);
    if (tError) console.error("Transactions insert failed:", tError);
    else console.log("Inserted 20 transactions.");

    // 3. Create Ads
    console.log("Creating 10 ads...");
    const ads = [];
    for (let i = 1; i <= 10; i++) {
        ads.push({
            title: `Premium Sponsor Ad #${i}`,
            description: `Boost your visibility with Sponsor Ad #${i}. Featured across the marketplace.`,
            link_url: "https://t.me/TrustPay9jaBot",
            duration_days: randInt(7, 30),
            status: (i % 3 === 0) ? "paused" : "active",
            expires_at: new Date(Date.now() + 86400000 * randInt(1, 10)).toISOString(),
            owner_telegram_id: sellerId,
            stars_paid: randInt(10, 100)
        });
    }
    const { error: aError } = await supabase.from("ads").insert(ads);
    if (aError) console.error("Ads insert failed:", aError);
    else console.log("Inserted 10 ads.");

    console.log("Seeding complete.");
}

seed();
