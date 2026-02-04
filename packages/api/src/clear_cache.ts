import { db, productsCache } from "@chi-and-rose/db";

async function main() {
    console.log("Clearing Product Analysis Cache...");
    try {
        await db.update(productsCache).set({ lastAnalysis: null });
        console.log("SUCCESS: All product analysis cache cleared. Rerun app to force fresh AI analysis.");
    } catch (e) {
        console.error("Failed to clear cache:", e);
    }
    process.exit(0);
}

main();
