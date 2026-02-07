import { db } from "@chi-and-rose/db";
import { communityGroupMembers, communityGroups } from "@chi-and-rose/db/schema/community";
import { eq, sql } from "drizzle-orm";

async function checkMembers() {
    const groupId = "7b31b68d-4eba-4008-a6d8-edf3cd1f1ad8";

    // Check group info
    const groups = await db.select().from(communityGroups).where(eq(communityGroups.id, groupId));
    console.log("Group info:", groups[0]);

    // Check actual members in join table
    const members = await db.select().from(communityGroupMembers).where(eq(communityGroupMembers.groupId, groupId));
    console.log("\nActual members in join table:", members.length);
    console.log("Sample members:", members.slice(0, 3));

    // Check member count
    const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(communityGroupMembers)
        .where(eq(communityGroupMembers.groupId, groupId));
    console.log("\nMember count from query:", countResult[0].count);

    process.exit(0);
}

checkMembers().catch(console.error);
