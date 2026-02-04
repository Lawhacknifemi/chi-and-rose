import { db } from "@chi-and-rose/db";
import { user, session } from "@chi-and-rose/db/schema/auth";

async function main() {
    const users = await db.select().from(user).limit(1);
    if (!users.length) {
        console.log("No users found. Cannot create session.");
        process.exit(1);
    }
    const userId = users[0].id;
    const token = "DEBUG-TOKEN-123";
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 1 day

    await db.insert(session).values({
        id: "debug-session-id",
        token,
        userId,
        expiresAt,
        ipAddress: "127.0.0.1",
        userAgent: "curl-debug"
    });

    console.log("Created debug session:", token);
    process.exit(0);
}

main().catch(console.error);
