import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://iqvkbmaiojuxzygscirc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxdmtibWFpb2p1eHp5Z3NjaXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzQ1MjIsImV4cCI6MjA4Nzg1MDUyMn0.SpB92Iljf05D3zjyY0_Ew10rO-hgQOZN7zmDark20mY";

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: listings } = await supabase.from("listings").select("id").limit(3);
    for (const l of listings) {
        const { data: files, error } = await supabase.storage.from("listing-images").list(`listings/${l.id}`);
        console.log(`Listing ${l.id}:`, files ? files.length : 0, "filesFound", error?.message || "");
    }
}

check();
