import { UpcItemDbClient } from "../src/lib/external/upc-client";
import { OpenBeautyFactsClient } from "../src/lib/external/obf-client";

async function main() {
    const barcode = "3337875545822";
    console.log(`Debug Flow for Barcode: ${barcode}`);

    const upcClient = new UpcItemDbClient();
    const obfClient = new OpenBeautyFactsClient();

    // 1. Simulate UPC Lookup
    console.log("1. Fetching from UPCitemdb...");
    const upcProduct = await upcClient.getProduct(barcode);

    if (!upcProduct) {
        console.log("❌ UPC Lookup Failed");
        return;
    }
    console.log(`✅ UPC Found: "${upcProduct.name}"`);
    console.log(`   Ingredients present: ${!!upcProduct.ingredientsRaw}`);

    // 2. Simulate Name Search Logic
    if (!upcProduct.ingredientsRaw && upcProduct.name) {
        console.log("2. Missing Ingredients. Attempting Name Search...");

        let query = upcProduct.name;
        // Replicating the logic from scanner.ts (if any specific logic was added, or just raw name)
        // I used 'let query = externalProduct.name;' in the previous turn.

        console.log(`   Search Query: "${query}"`);

        const searchResult = await obfClient.searchProduct(query);

        if (searchResult) {
            console.log(`✅ Search Result Found: "${searchResult.name}"`);
            console.log(`   Ingredients present: ${!!searchResult.ingredientsRaw}`);
            if (searchResult.ingredientsRaw) {
                console.log(`   Preview: ${searchResult.ingredientsRaw.substring(0, 50)}...`);
            }
        } else {
            console.log("❌ Name Search Failed (No results)");
        }
    } else {
        console.log("Skipping search (Ingredients already present or Name missing)");
    }
}

main();
