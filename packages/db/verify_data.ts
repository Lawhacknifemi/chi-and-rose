import { db, sql } from "./src/index";

async function verify() {
    try {
        console.log("--- DATA VERIFICATION ---");

        const users = await db.execute(sql`SELECT id, email, name FROM "user"`);
        console.log("Users:", users.rows);

        const sessions = await db.execute(sql`SELECT user_id, expires_at FROM session`);
        console.log("Sessions:", sessions.rows);

        const scansResult = await db.execute(sql`SELECT user_id, count(*) as count FROM scan GROUP BY user_id`);
        console.log("Scans by User:", scansResult.rows);

        console.log("--- END VERIFICATION ---");
        process.exit(0);
    } catch (err) {
        console.error("Verification failed:", err);
        process.exit(1);
    }
}

verify();
