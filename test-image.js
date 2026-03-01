import https from "https";

const imageUrl = "https://iqvkbmaiojuxzygscirc.supabase.co/storage/v1/object/public/listing-images/listings/a0e929cd-f5d5-4442-b9ea-0872d26e6faa/1772368565251-seed.jpg";

https.get(imageUrl, (res) => {
    console.log("Status Code:", res.statusCode);
    console.log("Headers:", res.headers);
    res.on("data", (d) => {
        // console.log(d.toString().substring(0, 100));
    });
}).on("error", (e) => {
    console.error(e);
});
