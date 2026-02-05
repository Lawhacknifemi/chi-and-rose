
import { db } from "@chi-and-rose/db";
import { productsCache } from "@chi-and-rose/db";
import { desc } from "drizzle-orm";

async function main() {
    console.log("Checking products_cache...");
    const products = await db.query.productsCache.findMany({
        orderBy: [desc(productsCache.lastFetched)],
        limit: 5,
    });

    if (products.length === 0) {
        console.log("No products found in cache.");
        return;
    }

    products.forEach(p => {
        console.log(`[${p.barcode}] ${p.name}`);
        console.log(` - Ingredients Raw: ${p.ingredientsRaw ? p.ingredientsRaw.substring(0, 50) + "..." : "NULL/EMPTY"}`);
        console.log(` - Last Analysis: ${JSON.stringify(p.lastAnalysis || "NULL").substring(0, 50)}...`);
    });

    process.exit(0);
}

main().catch(console.error);
