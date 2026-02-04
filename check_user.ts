
import { db } from "@chi-and-rose/db";
import { user } from "@chi-and-rose/db/schema/auth";
import { eq } from "drizzle-orm";

async function checkUser(email: string) {
    const u = await db.query.user.findFirst({
        where: eq(user.email, email)
    });
    console.log("User Lookup Result:", u);
}

checkUser("lawalsheriffnifemi@gmail.com").then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
