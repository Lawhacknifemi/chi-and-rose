import { db } from "@chi-and-rose/db";
import { communityGroups, communityPosts } from "@chi-and-rose/db/schema/community";
import { eq } from "drizzle-orm";

async function main() {
    console.log("--- Starting Diagnosis ---");

    // 1. Check all groups
    const groups = await db.select().from(communityGroups);
    console.log(`Total groups in DB: ${groups.length}`);
    if (groups.length > 0) {
        const firstGroup = groups[0]!;
        console.log(`Testing query with Group ID: ${firstGroup.id} (${firstGroup.name})`);

        const found = await db.select().from(communityGroups)
            .where(eq(communityGroups.id, firstGroup.id))
            .limit(1);

        console.log(`Result of direct query: ${found.length > 0 ? "FOUND" : "NOT FOUND"}`);
    }

    // 2. Check all posts
    const posts = await db.select().from(communityPosts);
    console.log(`Total posts in DB: ${posts.length}`);
    if (posts.length > 0) {
        const firstPost = posts[0]!;
        console.log(`Testing query with Post ID: ${firstPost.id} (${firstPost.title})`);

        const foundPost = await db.query.communityPosts.findFirst({
            where: eq(communityPosts.id, firstPost.id)
        });

        console.log(`Result of direct findFirst: ${foundPost ? "FOUND" : "NOT FOUND"}`);
    }

    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
