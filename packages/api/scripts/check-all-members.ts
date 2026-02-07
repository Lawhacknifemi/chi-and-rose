import { db } from "@chi-and-rose/db";
import { communityGroupMembers, communityGroups } from "@chi-and-rose/db/schema/community";
import { sql } from "drizzle-orm";

async function checkAllMembers() {
    // Check total members across all groups
    const totalMembers = await db.select({ count: sql<number>`count(*)` })
        .from(communityGroupMembers);
    console.log("Total members in community_group_members table:", totalMembers[0].count);

    // Check all groups
    const groups = await db.select().from(communityGroups);
    console.log("\nAll groups:");
    for (const group of groups) {
        const members = await db.select({ count: sql<number>`count(*)` })
            .from(communityGroupMembers)
            .where(sql`${communityGroupMembers.groupId} = ${group.id}`);
        console.log(`- ${group.name}: memberCount=${group.memberCount}, actual=${members[0].count}`);
    }

    process.exit(0);
}

checkAllMembers().catch(console.error);
