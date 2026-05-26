Deno.serve(async (req) => {
    try {
        const urls = [
            "https://vids2.hab-lounge.com/images/Army+of+the+Dead+cover+1.png",
            "https://vids2.hab-lounge.com/images/puss.jpg",
        ];
        
        let results = [];
        for (const url of urls) {
            const res = await fetch(url);
            results.push({ url, status: res.status, ok: res.ok, contentType: res.headers.get("content-type"), size: res.headers.get("content-length") });
        }
        return Response.json({ results });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});