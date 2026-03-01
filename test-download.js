import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://iqvkbmaiojuxzygscirc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxdmtibWFpb2p1eHp5Z3NjaXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzQ1MjIsImV4cCI6MjA4Nzg1MDUyMn0.SpB92Iljf05D3zjyY0_Ew10rO-hgQOZN7zmDark20mY";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDownload() {
    const { data: listings } = await supabase.from("listings").select("id").limit(1);
    const id = listings[0].id;
    const { data: files } = await supabase.storage.from("listing-images").list(`listings/${id}`);

    if (files && files.length > 0) {
        const fileName = files[0].name;
        const path = `listings/${id}/${fileName}`;
        console.log("Attempting to download:", path);
        const { data, error } = await supabase.storage.from("listing-images").download(path);
        if (error) {
            console.error("Download Error:", error);
        } else {
            console.log("Download Success! Size:", data.size);
        }
    } else {
        console.log("No files found to download.");
    }
}

testDownload();
