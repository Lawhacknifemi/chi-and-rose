import { Client } from "pg";

const DB_URL = "postgresql://postgres:password@localhost:5432/postgres";
const BARCODE = "3337875545822";

async function run() {
    const client = new Client({ connectionString: DB_URL });
    await client.connect();

    try {
        // 1. Verify Column Exists
        const resCol = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'products_cache' AND column_name = 'image_url';
    `);

        if (resCol.rows.length > 0) {
            console.log("✅ Column 'image_url' exists.");
        } else {
            console.log("❌ Column 'image_url' DOES NOT EXIST (Critical Error).");
        }

        // 2. Delete Product
        console.log(`Deleting product ${BARCODE} from cache...`);
        const resDelete = await client.query(`
      DELETE FROM "products_cache" WHERE "barcode" = $1;
    `, [BARCODE]);

        console.log(`✅ Deleted ${resDelete.rowCount} row(s) from products_cache.`);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

run();
