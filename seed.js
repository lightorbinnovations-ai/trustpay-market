import { createClient } from "@supabase/supabase-js";

// Supabase details
const supabaseUrl = "https://iqvkbmaiojuxzygscirc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxdmtibWFpb2p1eHp5Z3NjaXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzQ1MjIsImV4cCI6MjA4Nzg1MDUyMn0.SpB92Iljf05D3zjyY0_Ew10rO-hgQOZN7zmDark20mY";

const supabase = createClient(supabaseUrl, supabaseKey);

const categories = ["Electronics", "Vehicles", "Fashion", "Real Estate", "Services", "Jobs"];
const cities = ["Lagos", "Abuja", "Port Harcourt", "Kano", "Ibadan"];
const types = ["item", "service"];

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
    console.log("Starting DB seeding...");

    // Get some users
    const { data: users, error: userErr } = await supabase.from("bot_users").select("*").limit(10);
    if (userErr || !users || users.length < 2) {
        console.error("Need at least 2 users in bot_users table to create transactions.", userErr);

        // Instead of failing, let's create a couple of fake users.
        const fakeUsers = [
            { telegram_id: 111111111, first_name: "QA Buyer", username: "qa_buyer" },
            { telegram_id: 222222222, first_name: "QA Seller", username: "qa_seller" }
        ];
        await supabase.from("bot_users").upsert(fakeUsers, { onConflict: "telegram_id" });
        const { data: newUsers } = await supabase.from("bot_users").select("*").in("telegram_id", [111111111, 222222222]);
        users.push(...newUsers);
    }

    // 1. Create 30 Listings
    const listings = [];
    for (let i = 1; i <= 30; i++) {
        const seller = randElement(users);
        const category = randElement(categories);
        const type = randElement(types);
        listings.push({
            title: `QA Premium ${category} Item #${i}`,
            description: `This is a high-quality QA seeded listing for ${category}. Great condition and ready for immediate transaction via Escrow. Includes all original accessories.`,
            price: randInt(5000, 5000000), // Naira
            category: category,
            city: randElement(cities),
            country: "Nigeria",
            type: type,
            seller_telegram_id: seller.telegram_id,
            status: "active",
            // give a few a boosted status
            boosted_until: Math.random() > 0.8 ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null
        });
    }

    const { data: insertedListings, error: listingErr } = await supabase.from("listings").insert(listings).select();
    if (listingErr) {
        console.error("Error inserting listings:", listingErr);
        return;
    }
    console.log(`Inserted ${insertedListings.length} listings.`);

    // 2. Create Transactions for Escrow (Some pending, some paid, some released)
    const transactions = [];
    const statuses = ["pending", "paid", "released", "disputed", "refunded"];

    for (let i = 0; i < 20; i++) {
        const listing = randElement(insertedListings);
        let buyer;
        do {
            buyer = randElement(users);
        } while (buyer.telegram_id === listing.seller_telegram_id && users.length > 1); // Avoid self-buy

        transactions.push({
            amount: listing.price,
            buyer_telegram_id: buyer.telegram_id,
            seller_telegram_id: listing.seller_telegram_id,
            status: randElement(statuses),
            listing_id: listing.id
        });
    }

    const { error: txnErr } = await supabase.from("transactions").insert(transactions);
    if (txnErr) {
        console.error("Error inserting transactions:", txnErr);
    } else {
        console.log(`Inserted ${transactions.length} transactions.`);
    }

    // 3. Create Ads
    const ads = [];
    const adStatuses = ["active", "paused"];
    for (let i = 1; i <= 10; i++) {
        const owner = randElement(users);
        const status = randElement(adStatuses);
        ads.push({
            title: `Premium Sponsor Ad #${i}`,
            description: `Shop the best deals in town with our sponsored brand #QA${i}`,
            duration_days: randInt(1, 14),
            stars_paid: randInt(50, 500),
            owner_telegram_id: owner.telegram_id,
            status: status,
            expires_at: status === "active" ? new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() : null,
            link_url: "https://trustpay9ja.ng"
        });
    }

    const { error: adErr } = await supabase.from("ads").insert(ads);
    if (adErr) {
        console.error("Error inserting ads:", adErr);
    } else {
        console.log(`Inserted ${ads.length} ads.`);
    }

    console.log("Seeding complete.");
}

seed();
