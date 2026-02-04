import { OpenFoodFactsClient } from "../src/lib/external/off-client";
import { OpenBeautyFactsClient } from "../src/lib/external/obf-client";

async function main() {
    const barcode = "3337875545822";
    console.log(`Checking barcode: ${barcode}`);

    const offClient = new OpenFoodFactsClient();
    const obfClient = new OpenBeautyFactsClient();

    console.log("1. Checking OpenFoodFacts...");
    const foodProduct = await offClient.getProduct(barcode);
    if (foodProduct) {
        console.log("✅ Found in OpenFoodFacts:", foodProduct.name);
    } else {
        console.log("❌ Not found in OpenFoodFacts");
    }

    console.log("2. Checking OpenBeautyFacts...");
    const beautyProduct = await obfClient.getProduct(barcode);
    if (beautyProduct) {
        console.log("✅ Found in OpenBeautyFacts:", beautyProduct.name);
    } else {
        console.log("❌ Not found in OpenBeautyFacts");
    }
}

main();
