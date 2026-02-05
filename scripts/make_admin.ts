
import pg from "pg";

const { Pool } = pg;

const targetEmail = process.argv[2];

if (!targetEmail) {
    console.error("❌ Please provide an email address.");
    console.error("Usage: bun scripts/make_admin.ts <email>");
    process.exit(1);
}

// Helper to strip sslmode if present
const connectionString = (process.env.DATABASE_URL || "")
    .replace("?sslmode=require", "")
    .replace("&sslmode=require", "");

if (!connectionString.includes("postgres")) {
    console.error("❌ Invalid DATABASE_URL. Make sure to run with --env-file=deploy.env");
    process.exit(1);
}

console.log(`Connecting to DB...`);

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
});

async function main() {
    try {
        console.log(`Promoting user '${targetEmail}' to ADMIN...`);

        const result = await pool.query(
            `UPDATE "user" SET role = 'admin', updated_at = NOW() WHERE email = $1 RETURNING id, email, role`,
            [targetEmail]
        );

        if (result.rowCount === 0) {
            console.log(`❌ User not found with email: ${targetEmail}`);
        } else {
            console.log(`✅ Success! User ${result.rows[0].email} is now an ${result.rows[0].role}.`);
        }

    } catch (err) {
        console.error("❌ Error updating user:", err);
    } finally {
        await pool.end();
    }
}

main();
