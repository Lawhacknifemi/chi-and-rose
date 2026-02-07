import { db, sql } from "./src/index";

async function checkAnalysis() {
    try {
        console.log("--- ANALYSIS CHECK ---");

        const res = await db.execute(sql`SELECT barcode, name, last_analysis FROM products_cache WHERE last_analysis IS NOT NULL LIMIT 5`);
        console.log("Products with analysis:", JSON.stringify(res.rows, null, 2));

        const countNull = await db.execute(sql`SELECT count(*) FROM products_cache WHERE last_analysis IS NULL`);
        console.log("Products without cached analysis:", countNull.rows[0].count);

        console.log("--- END ANALYSIS ---");
        process.exit(0);
    } catch (err) {
        console.error("Analysis check failed:", err);
        process.exit(1);
    }
}

checkAnalysis();
