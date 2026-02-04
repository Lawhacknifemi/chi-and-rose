import pg from "pg";

const { Pool } = pg;

// Helper to strip sslmode if present, just in case
const connectionString = (process.env.DATABASE_URL || "")
    .replace("?sslmode=require", "")
    .replace("&sslmode=require", "");

console.log("Connecting to:", connectionString.replace(/:[^:@]*@/, ":***@")); // Hide password

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }, // Force allow self-signed
});

async function main() {
    console.log("Checking tables in database...");

    try {
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);

        if (result.rows.length === 0) {
            console.log("❌ No tables found in 'public' schema!");
        } else {
            console.log("✅ Found tables:");
            result.rows.forEach(row => console.log(` - ${row.table_name}`));
        }
    } catch (err) {
        console.error("❌ Error querying tables:", err);
    } finally {
        await pool.end();
    }
}

main();
