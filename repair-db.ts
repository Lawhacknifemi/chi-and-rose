import { Client } from "pg";

const DB_URL = "postgresql://postgres:password@localhost:5432/postgres";

async function repair() {
    console.log("Connecting to:", DB_URL);
    const client = new Client({ connectionString: DB_URL });
    await client.connect();

    try {
        console.log("Attempting to add missing image_url column...");
        await client.query(`
      ALTER TABLE "products_cache" 
      ADD COLUMN IF NOT EXISTS "image_url" text;
    `);
        console.log("✅ Successfully added 'image_url' column to 'products_cache'.");
    } catch (err) {
        console.error("Error altering DB:", err);
    } finally {
        await client.end();
    }
}

repair();
