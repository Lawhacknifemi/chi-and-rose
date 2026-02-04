import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as schema from "./packages/db/src/schema";
import { sql } from "drizzle-orm";

const DB_URL = "postgresql://postgres:password@localhost:5432/postgres";

async function verify() {
    console.log("Connecting to:", DB_URL);
    const client = new Client({ connectionString: DB_URL });
    await client.connect();

    try {
        const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products_cache';
    `);

        console.log("Columns in 'products_cache':");
        console.table(res.rows);

        const hasImage = res.rows.some(r => r.column_name === 'image_url');
        if (hasImage) {
            console.log("\n✅ 'image_url' column EXISTS.");
        } else {
            console.log("\n❌ 'image_url' column DOES NOT EXIST.");
        }

    } catch (err) {
        console.error("Error querying DB:", err);
    } finally {
        await client.end();
    }
}

verify();
