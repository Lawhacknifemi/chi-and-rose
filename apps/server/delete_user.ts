
import { db } from "@chi-and-rose/db";
import { user } from "@chi-and-rose/db/schema/auth";
import { eq } from "drizzle-orm";

async function deleteUser(email: string) {
    console.log(`Deleting user: ${email}`);
    await db.delete(user).where(eq(user.email, email));
    console.log("Deleted.");
}

await deleteUser("lawalsheriffnifemi@gmail.com");
