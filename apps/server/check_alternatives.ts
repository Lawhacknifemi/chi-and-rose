
import { aiService } from "../../packages/api/src/services/ai";
import { OpenFoodFactsClient } from "../../packages/api/src/lib/external/off-client";

async function main() {
    console.log("Checking AI Alternatives...");
    const results = await aiService.suggestAlternatives("Test Product", ["Parabens"]);
    console.log(JSON.stringify(results, null, 2));

    // const client = new OpenFoodFactsClient();
    const queries = [
        "CeraVe Daily Moisturizing Lotion",
        "CeraVe",
        "Burt's Bees Sensitive Facial Cleanser"
    ];

    for (const q of queries) {
        console.log(`Searching for: "${q}"`);
        const res = await client.searchProduct(q);
        console.log(` - Found: ${res ? res.name : "NULL"}`);
        console.log(` - Image: ${res ? res.imageUrl : "N/A"}`);
    }
}

main();
