
import { db, user } from "../src";
import { eq } from "drizzle-orm";

const email = process.argv[2];

if (!email) {
    console.error("Please provide an email address: bun run scripts/make-admin.ts <email>");
    process.exit(1);
}

async function main() {
    console.log(`Looking for user with email: ${email}...`);
    const found = await db.select().from(user).where(eq(user.email, email));

    if (found.length === 0) {
        console.error("User not found!");
        process.exit(1);
    }

    console.log("Current user:", found[0]);

    await db.update(user).set({ role: "admin" }).where(eq(user.email, email));
    console.log(`✅ Successfully promoted ${email} to admin.`);
}

main().catch(console.error);
