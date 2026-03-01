import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://iqvkbmaiojuxzygscirc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxdmtibWFpb2p1eHp5Z3NjaXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzQ1MjIsImV4cCI6MjA4Nzg1MDUyMn0.SpB92Iljf05D3zjyY0_Ew10rO-hgQOZN7zmDark20mY";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
    console.log("Fetching listings...");
    const { data, error } = await supabase.from("listings").select("*").limit(5);
    console.log("Data:", data?.length);
    console.log("Error:", error);
}

testFetch();
