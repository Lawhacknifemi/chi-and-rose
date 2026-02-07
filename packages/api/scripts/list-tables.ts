
import { db } from "@chi-and-rose/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Checking tables in database...");

    // Check connection string (censored)
    const dbUrl = process.env.DATABASE_URL || "NOT_SET";
    console.log(`Using Database: ${dbUrl.replace(/:[^:@]+@/, ":****@")}`);

    const result: any = await db.execute(sql`
        SELECT table_schema, table_name 
        FROM information_schema.tables 
        WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
        ORDER BY table_schema, table_name;
    `);

    console.log("Result type:", typeof result);
    console.log("Result keys:", Object.keys(result));

    // PostgresJS or different drivers might return different structures.
    // 'pg' returns { rows: [] }
    // 'postgres' (js) returns array directly
    // Let's handle both.

    let rows = [];
    if (Array.isArray(result)) {
        rows = result;
    } else if (result.rows && Array.isArray(result.rows)) {
        rows = result.rows;
    } else {
        console.log("Could not find rows in result!", result);
        rows = [];
    }

    console.log(`\nTables found (${rows.length}):`);
    rows.forEach((row: any) => {
        console.log(`- [${row.table_schema}] ${row.table_name}`);
    });

    process.exit(0);
}

main().catch(console.error);
