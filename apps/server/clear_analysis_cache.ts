
import { db, productsCache } from "@chi-and-rose/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Clearing all cached analysis...");

    // Set lastAnalysis to null for all products
    await db.update(productsCache)
        .set({ lastAnalysis: null })
        .execute();

    console.log("Cache cleared! Next scan will regenerate analysis.");
    process.exit(0);
}

main();
