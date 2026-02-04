import { Client } from "pg";

const DB_URL = "postgresql://postgres:password@localhost:5432/postgres";
const USER_ID = "DZc2Rvjz3Xn8jfG4PPFFADu63zA11vh8";

async function debug() {
    const client = new Client({ connectionString: DB_URL });
    await client.connect();

    try {
        console.log(`Fetching scans for user: ${USER_ID}`);

        // 1. Fetch Scans
        const resScans = await client.query(`
        SELECT id, barcode, created_at 
        FROM "scan" 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT 10
    `, [USER_ID]);

        console.log(`Found ${resScans.rowCount} scans.`);

        for (const scan of resScans.rows) {
            // 2. Fetch Product
            const resProduct = await client.query(`
            SELECT name, image_url 
            FROM "products_cache" 
            WHERE barcode = $1
        `, [scan.barcode]);

            const product = resProduct.rows[0];
            console.log(`\nScan: ${scan.barcode} (${scan.created_at})`);
            if (product) {
                console.log(`  Name: ${product.name}`);
                console.log(`  Image: ${product.image_url ? "✅ " + product.image_url : "❌ NULL"}`);
            } else {
                console.log(`  ❌ Product NOT found in cache!`);
            }
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

debug();
