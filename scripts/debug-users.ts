import { Client } from "pg";

const DB_URL = "postgresql://postgres:password@localhost:5432/postgres";

async function debugUsers() {
    const client = new Client({ connectionString: DB_URL });
    await client.connect();

    try {
        console.log("--- USERS ---");
        const resUsers = await client.query(`SELECT id, email, name, role FROM "user"`);
        console.table(resUsers.rows);

        console.log("\n--- RECENT SCANS ---");
        const resScans = await client.query(`
        SELECT s.id, s.user_id, u.email, s.barcode, s.created_at 
        FROM "scan" s
        JOIN "user" u ON s.user_id = u.id
        ORDER BY s.created_at DESC
        LIMIT 10
    `);
        console.table(resScans.rows);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

debugUsers();
