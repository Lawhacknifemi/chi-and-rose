
import { db, productsCache } from "@chi-and-rose/db";
import { eq } from "drizzle-orm";

async function check() {
    console.log("Checking DB for products with analysis...");
    const products = await db.select().from(productsCache).limit(5);

    if (products.length === 0) {
        console.log("No products in cache.");
        return;
    }

    for (const p of products) {
        console.log(`Product: ${p.name} (${p.barcode})`);
        console.log("Has lastAnalysis?", !!p.lastAnalysis);
        if (p.lastAnalysis) {
            const analysis = p.lastAnalysis as any;
            console.log(" Safety Level:", analysis.safetyLevel);
            console.log(" Alternatives Count:", analysis.alternatives?.length);
            if (analysis.alternatives?.length > 0) {
                console.log(" First Alt:", JSON.stringify(analysis.alternatives[0]));
            }
        }
        console.log("---");
    }
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
