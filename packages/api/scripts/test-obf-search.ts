async function main() {
    const query = "La Roche-Posay Toleriane";
    console.log(`Searching OpenBeautyFacts for: ${query}`);

    // Standard OBF Search endpoint (v2)
    // https://world.openbeautyfacts.org/cgi/search.pl?search_terms=...&search_simple=1&action=process&json=1
    const url = `https://world.openbeautyfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1`;

    try {
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            console.log("Count:", data.count);
            if (data.products && data.products.length > 0) {
                console.log(`Found ${data.products.length} products (showing top 5):`);
                data.products.slice(0, 5).forEach((p: any, i: number) => {
                    console.log(`[${i}] ${p.product_name} | Ingredients: ${p.ingredients_text ? "YES" : "NO"} | Barcode: ${p.code}`);
                });
            } else {
                console.log("No matches found.");
            }
        } else {
            console.log("Error:", response.status);
        }
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

main();
