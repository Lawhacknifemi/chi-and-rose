import { db, productsCache, scans, sql } from "./src/index";

async function diagnose() {
    try {
        console.log("--- DB DIAGNOSIS ---");

        const productsCount = await db.select({ count: sql<number>`count(*)` }).from(productsCache);
        console.log(`Products in cache: ${productsCount[0].count}`);

        const scansCount = await db.select({ count: sql<number>`count(*)` }).from(scans);
        console.log(`Total scans recorded: ${scansCount[0].count}`);

        if (scansCount[0].count > 0) {
            const sampleScans = await db.select().from(scans).limit(5);
            console.log("Sample scans:", sampleScans);
        }

        console.log("--- END DIAGNOSIS ---");
        process.exit(0);
    } catch (err) {
        console.error("Diagnosis failed:", err);
        process.exit(1);
    }
}

diagnose();
