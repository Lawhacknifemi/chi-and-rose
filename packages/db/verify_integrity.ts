import { db, sql } from "./src/index";

async function verifyIntegrity() {
    try {
        console.log("--- INTEGRITY CHECK ---");

        const orphanedScans = await db.execute(sql`
            SELECT s.barcode, count(*) 
            FROM scan s 
            LEFT JOIN products_cache p ON s.barcode = p.barcode 
            WHERE p.barcode IS NULL 
            GROUP BY s.barcode
        `);
        console.log("Orphaned Scans (no product in cache):", orphanedScans.rows);

        const cachedProducts = await db.execute(sql`SELECT barcode, name FROM products_cache`);
        console.log("Products in Cache:", cachedProducts.rows);

        console.log("--- END INTEGRITY ---");
        process.exit(0);
    } catch (err) {
        console.error("Integrity check failed:", err);
        process.exit(1);
    }
}

verifyIntegrity();
