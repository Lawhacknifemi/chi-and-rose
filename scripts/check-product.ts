import { Client } from "pg";

const DB_URL = "postgresql://postgres:password@localhost:5432/postgres";
const BARCODE = "3337875545822";

async function check() {
    const client = new Client({ connectionString: DB_URL });
    await client.connect();

    try {
        const res = await client.query(`
      SELECT barcode, name, image_url FROM "products_cache" WHERE "barcode" = $1;
    `, [BARCODE]);

        if (res.rows.length === 0) {
            console.log("Product NOT found in cache (User hasn't scanned it yet).");
        } else {
            const p = res.rows[0];
            console.log("✅ Product Found!");
            console.log(`Name: ${p.name}`);
            console.log(`Image URL: ${p.image_url || "❌ STILL MISSING"}`);
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

check();
