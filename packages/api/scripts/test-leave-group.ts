
import { db } from "@chi-and-rose/db";
import { user } from "@chi-and-rose/db/schema/auth";
import { communityGroups, communityGroupMembers } from "@chi-and-rose/db/schema/community";
import { eq, and } from "drizzle-orm";
import { communityRouter } from "../src/routers/community";

// Mock implementation of ORPC caller for testing
async function mockCall(handler: any, input: any, sessionUser: any) {
    const context = {
        session: {
            user: sessionUser
        }
    };

    // Access internal handler for ORPC
    if (handler['~orpc'] && handler['~orpc'].handler) {
        return handler['~orpc'].handler({ input, context });
    }

    // Fallback or debug
    console.log("Handler keys:", Object.keys(handler));
    if (typeof handler === 'function') {
        return handler({ input, context }); // It might be a direct function
    }

    console.log("Handler:", handler);
    throw new Error("Unknown handler structure");
}

async function main() {
    console.log("--- Testing Leave Group Functionality ---");

    // 1. Get a test user
    const users = await db.select().from(user).limit(1);
    if (users.length === 0) {
        console.error("No users found in DB. Please seed users first.");
        process.exit(1);
    }
    const testUser = users[0];
    console.log(`Test User: ${testUser.name} (${testUser.id})`);

    // 2. Create a temporary group
    const groupName = `Test Group ${Date.now()}`;
    console.log(`Creating group: ${groupName}`);

    try {
        await mockCall(communityRouter.createGroup, {
            name: groupName,
            description: "Temporary test group",
        }, testUser);
    } catch (e) {
        console.error("Error creating group:", e);
        // Note: Sometimes the return value check might fail if mocked context doesn't match perfectly, 
        // but let's see if the row is created.
    }

    const group = await db.query.communityGroups.findFirst({
        where: eq(communityGroups.name, groupName)
    });

    if (!group) {
        console.error("Failed to create group.");
        process.exit(1);
    }
    console.log(`Group Created: ${group.id}`);

    // 3. Verify Join 
    console.log("Attempting to Join Group...");
    try {
        await mockCall(communityRouter.joinGroup, { groupId: group.id }, testUser);
        console.log("Joined Group.");
    } catch (e) {
        console.error("Error joining group:", e);
    }

    // Check membership
    let membership = await db.select().from(communityGroupMembers).where(and(
        eq(communityGroupMembers.groupId, group.id),
        eq(communityGroupMembers.userId, testUser.id)
    ));
    console.log(`Is Member? ${membership.length > 0}`);

    // Check isJoined from getGroupDetails
    let details = await mockCall(communityRouter.getGroupDetails, { groupId: group.id }, testUser);
    console.log(`getGroupDetails.isJoined: ${details.isJoined}`);
    console.log(`getGroupDetails.memberCount: ${details.memberCount}`);

    // 4. Leave Group
    console.log("Attempting to Leave Group...");
    try {
        await mockCall(communityRouter.leaveGroup, { groupId: group.id }, testUser);
        console.log("Left Group.");
    } catch (e) {
        console.error("Error leaving group:", e);
    }

    // 5. Verify Leave
    membership = await db.select().from(communityGroupMembers).where(and(
        eq(communityGroupMembers.groupId, group.id),
        eq(communityGroupMembers.userId, testUser.id)
    ));
    console.log(`Is Member? ${membership.length > 0}`);

    details = await mockCall(communityRouter.getGroupDetails, { groupId: group.id }, testUser);
    console.log(`getGroupDetails.isJoined: ${details.isJoined}`);
    console.log(`getGroupDetails.memberCount: ${details.memberCount}`);

    if (membership.length === 0 && details.isJoined === false) {
        console.log("SUCCESS: Leave Group functionality verified.");
    } else {
        console.error("FAILURE: Leave Group functionality failed.");
    }

    // Cleanup
    console.log("Cleaning up...");
    await db.delete(communityGroups).where(eq(communityGroups.id, group.id));

    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
