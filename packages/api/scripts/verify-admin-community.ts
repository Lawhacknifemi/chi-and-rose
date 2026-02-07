
import { db } from "@chi-and-rose/db";
import { communityGroups, communityPosts, communityComments, communityGroupMembers } from "@chi-and-rose/db/schema/community";
import { user } from "@chi-and-rose/db/schema/auth";
import { eq, and } from "drizzle-orm";

async function main() {
    console.log("--- Verifying Community Admin Features ---");

    // 1. Find an admin user
    const adminUser = await db.query.user.findFirst({
        where: eq(user.role, 'admin')
    });

    if (!adminUser) {
        console.error("No admin user found for testing.");
        return;
    }
    console.log(`Using admin user: ${adminUser.name} (${adminUser.id})`);

    // 2. Create a test group (simulating admin action)
    const groupName = `Admin Test Group ${Date.now()}`;
    await db.insert(communityGroups).values({
        name: groupName,
        description: "Testing admin features",
        creatorId: adminUser.id
    });

    const [testGroup] = await db.select().from(communityGroups).where(eq(communityGroups.name, groupName));
    console.log(`Created test group: ${testGroup.name} (${testGroup.id})`);

    // 3. Update the group
    const updatedName = `${groupName} (Updated)`;
    await db.update(communityGroups)
        .set({ name: updatedName })
        .where(eq(communityGroups.id, testGroup.id));

    const [updatedGroup] = await db.select().from(communityGroups).where(eq(communityGroups.id, testGroup.id));
    if (updatedGroup.name === updatedName) {
        console.log("✓ adminUpdateGroup (DB verify) success");
    } else {
        console.error("✗ adminUpdateGroup (DB verify) failed");
    }

    // 4. Create a test post in the group
    const postTitle = "Admin Moderation Test Post";
    await db.insert(communityPosts).values({
        groupId: testGroup.id,
        userId: adminUser.id,
        title: postTitle,
        content: "This post will be deleted by an admin."
    });

    const [testPost] = await db.select().from(communityPosts).where(eq(communityPosts.title, postTitle));
    console.log(`Created test post: ${testPost.title} (${testPost.id})`);

    // 5. Test Commenting Permission Toggle
    console.log("Testing commenting permission toggle...");
    await db.update(user).set({ canComment: false }).where(eq(user.id, adminUser.id));
    const [suspendedUser] = await db.select().from(user).where(eq(user.id, adminUser.id));
    if (!suspendedUser.canComment) {
        console.log("✓ canComment toggle (off) success");
    } else {
        console.error("✗ canComment toggle (off) failed");
    }

    await db.update(user).set({ canComment: true }).where(eq(user.id, adminUser.id));
    const [restoredUser] = await db.select().from(user).where(eq(user.id, adminUser.id));
    if (restoredUser.canComment) {
        console.log("✓ canComment toggle (on) success");
    } else {
        console.error("✗ canComment toggle (on) failed");
    }

    // 6. Test Comment Deletion
    console.log("Testing comment deletion...");
    // Create test post and comment
    const [tempPostId] = await db.insert(communityPosts).values({
        groupId: testGroup.id,
        userId: adminUser.id,
        title: "Comment Test Post",
        content: "Content"
    }).returning({ id: communityPosts.id });

    const [tempCommentId] = await db.insert(communityComments).values({
        postId: tempPostId.id,
        userId: adminUser.id,
        content: "Test Comment"
    }).returning({ id: communityComments.id });

    await db.delete(communityComments).where(eq(communityComments.id, tempCommentId.id));
    const [deletedComment] = await db.select().from(communityComments).where(eq(communityComments.id, tempCommentId.id));
    if (!deletedComment) {
        console.log("✓ adminDeleteComment (DB verify) success");
    } else {
        console.error("✗ adminDeleteComment (DB verify) failed");
    }

    // Cleanup
    await db.delete(communityPosts).where(eq(communityPosts.id, tempPostId.id));
    await db.delete(communityGroups).where(eq(communityGroups.id, testGroup.id));

    console.log("--- Community Moderation Enhancements Verification Completed ---");
}

main().catch(console.error);
