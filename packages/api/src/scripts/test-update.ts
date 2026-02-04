
import { db, productsCache } from "@chi-and-rose/db";
import { eq } from "drizzle-orm";

async function testUpdate() {
    const barcode = "4099100112658"; // The Granola from the user logs
    console.log(`Testing manual update for ${barcode}...`);

    const product = await db.query.productsCache.findFirst({
        where: eq(productsCache.barcode, barcode),
    });

    if (!product) {
        console.log("Product not found in DB!");
        return;
    }

    console.log("Current lastAnalysis:", product.lastAnalysis);

    const dummyAnalysis = {
        score: 99,
        safetyLevel: "Good",
        summary: "Manual Test Update",
        concerns: [],
        positives: ["Test Positive"],
        alternatives: [{ productName: "Manual Alt", brand: "Test Brand", reason: "Testing" }]
    };

    console.log("Updating...");
    await db.update(productsCache)
        .set({ lastAnalysis: dummyAnalysis })
        .where(eq(productsCache.barcode, barcode));

    console.log("Update done. Re-fetching...");

    const updatedProduct = await db.query.productsCache.findFirst({
        where: eq(productsCache.barcode, barcode),
    });

    console.log("New lastAnalysis:", JSON.stringify(updatedProduct?.lastAnalysis, null, 2));
}

testUpdate().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
