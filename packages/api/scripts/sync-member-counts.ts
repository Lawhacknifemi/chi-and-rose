import { db } from "@chi-and-rose/db";
import { communityGroupMembers, communityGroups } from "@chi-and-rose/db/schema/community";
import { sql, eq } from "drizzle-orm";

async function syncMemberCounts() {
    console.log("🔄 Syncing member counts for all groups...\n");

    // Get all groups
    const groups = await db.select().from(communityGroups);

    for (const group of groups) {
        // Count actual members
        const result = await db.select({ count: sql<number>`count(*)` })
            .from(communityGroupMembers)
            .where(eq(communityGroupMembers.groupId, group.id));

        const actualCount = Number(result[0].count);

        // Update if different
        if (group.memberCount !== actualCount) {
            console.log(`📊 ${group.name}:`);
            console.log(`   Old count: ${group.memberCount}`);
            console.log(`   Actual count: ${actualCount}`);

            await db.update(communityGroups)
                .set({ memberCount: actualCount })
                .where(eq(communityGroups.id, group.id));

            console.log(`   ✅ Updated!\n`);
        } else {
            console.log(`✓ ${group.name}: Already in sync (${actualCount} members)\n`);
        }
    }

    console.log("✅ All member counts synced successfully!");
    process.exit(0);
}

syncMemberCounts().catch(console.error);
