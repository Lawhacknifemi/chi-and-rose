import { Client } from "pg";
import { env } from "./apps/server/.env"; // This won't work directly with bun .env
// We will rely on bun --env-file

async function main() {
    console.log("Connecting to DB...");
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });
    await client.connect();

    console.log("Connected. Checking columns for user_profile...");
    const res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'user_profile';
  `);

    console.log("Columns found:");
    res.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type})`));

    await client.end();
}

main().catch(console.error);
