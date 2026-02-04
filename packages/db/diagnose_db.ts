import { Client } from "pg";

async function main() {
    console.log("[Diagnostic] Connecting to DB...");
    console.log("URL:", process.env.DATABASE_URL?.replace(/:[^:@]*@/, ":***@")); // Redact password

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        console.log("[Diagnostic] Connected successfully.");

        // 1. List Tables
        console.log("\n[Diagnostic] Listing Tables:");
        const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
        tables.rows.forEach(r => console.log(` - ${r.table_name}`));

        // 2. Check user_profile columns
        console.log("\n[Diagnostic] Checking 'user_profile' columns:");
        const columns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_profile';
    `);
        columns.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type})`));

        // 3. Simple Read Test
        console.log("\n[Diagnostic] Read Test (count users):");
        const count = await client.query('SELECT count(*) FROM "user"');
        console.log("User count:", count.rows[0].count);

    } catch (err) {
        console.error("\n[Diagnostic] ERROR:", err);
    } finally {
        await client.end();
    }
}

main();
