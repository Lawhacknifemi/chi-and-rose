import { db } from "@chi-and-rose/db";
import { session } from "@chi-and-rose/db/schema/auth";

async function main() {
    const result = await db.select().from(session).limit(1);
    if (result.length > 0) {
        console.log("TOKEN:", result[0].token);
    } else {
        console.log("No sessions found.");
    }
    process.exit(0);
}

main().catch(console.error);
