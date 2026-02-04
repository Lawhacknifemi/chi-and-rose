import { OpenBeautyFactsClient } from "../packages/api/src/lib/external/obf-client";

const openBeautyFactsClient = new OpenBeautyFactsClient();

const BARCODE = "3337875545822";

async function test() {
    console.log(`Fetching ${BARCODE} from OBF...`);
    try {
        const product = await openBeautyFactsClient.getProduct(BARCODE);
        console.log("Result:");
        console.log(JSON.stringify(product, null, 2));

        if (product && product.imageUrl) {
            console.log("✅ Image URL extracted:", product.imageUrl);
        } else {
            console.log("❌ No Image URL found in extracted data.");
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

test();
