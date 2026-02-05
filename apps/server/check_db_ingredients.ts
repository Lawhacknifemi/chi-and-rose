
import { db } from "@chi-and-rose/db";
import { productsCache } from "@chi-and-rose/db";
import { desc } from "drizzle-orm";

async function main() {
    console.log("Checking products_cache...");
    try {
        const products = await db.query.productsCache.findMany({
            orderBy: [desc(productsCache.lastFetched)],
            limit: 5,
        });

        products.forEach(p => {
            console.log(`[${p.barcode}] ${p.name}`);
            const analysis = p.lastAnalysis as any;
            if (analysis) {
                console.log("   Keys:", Object.keys(analysis));
                console.log(`   - score: ${analysis.score}`);
                console.log(`   - overallSafetyScore: ${analysis.overallSafetyScore}`);
            } else {
                console.log("   - No Analysis");
            }
        });
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

main();
