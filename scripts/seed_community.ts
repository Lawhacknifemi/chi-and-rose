
import { db } from "../packages/db/src";
import { communityGroups, communityPosts } from "../packages/db/src/schema/community";
import { user } from "../packages/db/src/schema/auth";

async function main() {
    console.log("🌱 Seeding community data...");

    // 1. Get a default user to modify posts
    const defaultUser = await db.query.user.findFirst();
    if (!defaultUser) {
        console.error("❌ No users found. Please create a user first via the app.");
        return;
    }

    // 2. Create Groups
    const groupsToCreate = [
        {
            name: "PCOS Support Group",
            description: "A safe space for managing PCOS symptoms naturally.",
            iconUrl: "https://api.dicebear.com/7.x/initials/svg?seed=PCOS",
            memberCount: 1205
        },
        {
            name: "Clean Beauty Enthusiasts",
            description: "Discussing non-toxic products and routines.",
            iconUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Clean",
            memberCount: 850
        },
        {
            name: "Endo Girls Forum",
            description: "Support for endometriosis warriors.",
            iconUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Endo",
            memberCount: 640
        }
    ];

    const createdGroups = [];

    for (const group of groupsToCreate) {
        const inserted = await db.insert(communityGroups).values(group).returning();
        createdGroups.push(inserted[0]);
        console.log(`✅ Created group: ${group.name}`);
    }

    // 3. Create Sample Posts
    const postsToCreate = [
        {
            groupId: createdGroups[0].id,
            userId: defaultUser.id,
            title: "Best snacks for PCOS management",
            content: "I've been struggling with cravings lately. Does anyone have good recommendations for low-GI snacks that actually taste good?",
            likesCount: 15,
            commentsCount: 3
        },
        {
            groupId: createdGroups[1].id,
            userId: defaultUser.id,
            title: "Weekly wellness thread: Share your go-to tips!",
            content: "Happy Monday! Let's start the week right. Share one wellness habit you're committing to this week.",
            likesCount: 24,
            commentsCount: 8
        },
        {
            groupId: createdGroups[2].id,
            userId: defaultUser.id,
            title: "How I reduced symptoms of endometriosis naturally!",
            content: "Consistency with anti-inflammatory diet has been key for me. Cutting out gluten and dairy made a huge difference.",
            likesCount: 42,
            commentsCount: 12
        }
    ];

    for (const post of postsToCreate) {
        await db.insert(communityPosts).values(post);
        console.log(`✅ Created post: ${post.title}`);
    }

    console.log("🎉 Seeding complete!");
    process.exit(0);
}

main().catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
});
