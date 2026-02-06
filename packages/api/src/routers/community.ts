
import { z } from "zod";
import { protectedProcedure, adminProcedure } from "../index"; // Using alias or relative path to trpc setup
import { os } from "@orpc/server";
import { db } from "@chi-and-rose/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { communityGroups, communityPosts, communityComments, communityGroupMembers } from "@chi-and-rose/db/schema/community";
import { user as userTable } from "@chi-and-rose/db/schema/auth";

// Define Zod schemas for inputs
const createPostSchema = z.object({
    groupId: z.string().uuid(),
    title: z.string().min(3),
    content: z.string().min(10),
    imageUrl: z.string().optional(),
});

const createCommentSchema = z.object({
    postId: z.string().uuid(),
    content: z.string().min(1),
});

// Get all available groups
export const getGroups = protectedProcedure
    .output(z.array(z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().nullable(),
        iconUrl: z.string().nullable(),
        memberCount: z.number()
    })))
    .handler(async () => {
        const groups = await db.select().from(communityGroups);
        return groups;
    });

// Create a new group
export const createGroup = protectedProcedure
    .input(z.object({
        name: z.string().min(3),
        description: z.string().optional()
    }))
    .handler(async ({ input, context }) => {
        const user = context.session?.user;
        if (!user) throw new Error("Unauthorized");

        await db.insert(communityGroups).values({
            name: input.name,
            description: input.description,
            creatorId: user.id,
            memberCount: 1
        });

        return { success: true };
    });

// Join a group
export const joinGroup = protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .handler(async ({ input, context }) => {
        const user = context.session?.user;
        if (!user) throw new Error("Unauthorized");

        // Check if already member
        const existing = await db.select().from(communityGroupMembers)
            .where(and(
                eq(communityGroupMembers.groupId, input.groupId),
                eq(communityGroupMembers.userId, user.id)
            ))
            .limit(1);

        if (existing.length > 0) return { success: true };

        await db.insert(communityGroupMembers).values({
            groupId: input.groupId,
            userId: user.id
        });

        // Increment member count
        await db.update(communityGroups)
            .set({ memberCount: sql`${communityGroups.memberCount} + 1` })
            .where(eq(communityGroups.id, input.groupId));

        return { success: true };
    });

// Leave a group
export const leaveGroup = protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .handler(async ({ input, context }) => {
        const user = context.session?.user;
        if (!user) throw new Error("Unauthorized");

        const deleted = await db.delete(communityGroupMembers)
            .where(and(
                eq(communityGroupMembers.groupId, input.groupId),
                eq(communityGroupMembers.userId, user.id)
            ))
            .returning();

        if (deleted.length > 0) {
            // Decrement member count
            await db.update(communityGroups)
                .set({ memberCount: sql`${communityGroups.memberCount} - 1` })
                .where(eq(communityGroups.id, input.groupId));
        }

        return { success: true };
    });

// Get Group Details
export const getGroupDetails = protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .handler(async ({ input, context }) => {
        const user = context.session?.user;
        // Get group info
        const groups = await db.select().from(communityGroups)
            .where(eq(communityGroups.id, input.groupId))
            .limit(1);

        const group = groups[0];

        if (!group) throw new Error("Group not found");

        // Dynamic member count
        const memberCountResult = await db.select({ count: sql<number>`count(*)` })
            .from(communityGroupMembers)
            .where(eq(communityGroupMembers.groupId, input.groupId));

        const memberCount = Number(memberCountResult[0]?.count ?? 0);

        // Check membership
        let isJoined = false;
        if (user) {
            const membership = await db.select().from(communityGroupMembers)
                .where(and(
                    eq(communityGroupMembers.groupId, input.groupId),
                    eq(communityGroupMembers.userId, user.id)
                ))
                .limit(1);
            isJoined = membership.length > 0;
        }

        return { ...group, memberCount, isJoined };
    });

// List posts for a specific group
export const listGroupPosts = protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .handler(async ({ input }) => {
        const posts = await db.select({
            id: communityPosts.id,
            groupId: communityPosts.groupId,
            userId: communityPosts.userId,
            title: communityPosts.title,
            content: communityPosts.content,
            createdAt: communityPosts.createdAt,
            updatedAt: communityPosts.updatedAt,
            author: {
                id: userTable.id,
                name: userTable.name,
                image: userTable.image
            },
            // Dynamic comment count using subquery
            commentsCount: sql<number>`(SELECT count(*) FROM ${communityComments} WHERE ${communityComments.postId} = ${communityPosts.id})`.mapWith(Number)
        })
            .from(communityPosts)
            .leftJoin(userTable, eq(communityPosts.userId, userTable.id))
            .where(eq(communityPosts.groupId, input.groupId))
            .orderBy(desc(communityPosts.createdAt))
            .limit(20);

        return posts;
    });

// Get Community Feed (Latest posts across all groups)
export const getFeed = protectedProcedure
    .output(z.array(z.object({
        id: z.string(),
        title: z.string(),
        content: z.string(),
        imageUrl: z.string().nullable(),
        likesCount: z.number(),
        commentsCount: z.number(),
        createdAt: z.date(),
        group: z.object({
            id: z.string(),
            name: z.string()
        }).nullable(),
        author: z.object({
            id: z.string(),
            name: z.string(),
            image: z.string().nullable()
        }).nullable()
    })))
    .handler(async () => {
        // Fetch posts with author and group details using select + subquery for accurate counts
        const posts = await db.select({
            id: communityPosts.id,
            title: communityPosts.title,
            content: communityPosts.content,
            imageUrl: communityPosts.imageUrl,
            likesCount: communityPosts.likesCount,
            createdAt: communityPosts.createdAt,
            updatedAt: communityPosts.updatedAt,
            // Subquery for dynamic comment count
            commentsCount: sql<number>`(SELECT count(*) FROM ${communityComments} WHERE ${communityComments.postId} = ${communityPosts.id})`.mapWith(Number),
            group: {
                id: communityGroups.id,
                name: communityGroups.name
            },
            author: {
                id: userTable.id,
                name: userTable.name,
                image: userTable.image
            }
        })
            .from(communityPosts)
            .leftJoin(communityGroups, eq(communityPosts.groupId, communityGroups.id))
            .leftJoin(userTable, eq(communityPosts.userId, userTable.id))
            .orderBy(desc(communityPosts.createdAt))
            .limit(20);

        return posts.map(post => ({
            ...post,
            group: post.group.id ? post.group : null, // Handle potential nulls from left join if needed, though schema enforces some
            author: post.author.id ? post.author : null
        }));
    });

// Create a new post
export const createPost = protectedProcedure
    .input(createPostSchema)
    .handler(async ({ input, context }) => {
        const user = context.session?.user; // Access authenticated user from context
        if (!user) throw new Error("Unauthorized");

        // Check if user has permission to post/comment
        const [userData] = await db.select().from(userTable).where(eq(userTable.id, user.id));
        if (userData && !userData.canComment) throw new Error("Your posting and commenting privileges have been suspended.");

        await db.insert(communityPosts).values({
            groupId: input.groupId,
            userId: user.id,
            title: input.title,
            content: input.content,
            imageUrl: input.imageUrl
        });

        return { success: true };
    });

// Create a comment
export const createComment = protectedProcedure
    .input(createCommentSchema)
    .handler(async ({ input, context }) => {
        const user = context.session?.user;
        if (!user) throw new Error("Unauthorized");

        // Check if user has permission to post/comment
        const [userData] = await db.select().from(userTable).where(eq(userTable.id, user.id));
        if (userData && !userData.canComment) throw new Error("Your posting and commenting privileges have been suspended.");

        await db.insert(communityComments).values({
            postId: input.postId,
            userId: user.id,
            content: input.content
        });

        return { success: true };
    });

// Update an existing post
export const updatePost = protectedProcedure
    .input(z.object({
        postId: z.string().uuid(),
        title: z.string().min(3),
        content: z.string().min(10)
    }))
    .handler(async ({ input, context }) => {
        const user = context.session?.user;
        if (!user) throw new Error("Unauthorized");

        // Verify ownership
        const existingPost = await db.query.communityPosts.findFirst({
            where: eq(communityPosts.id, input.postId)
        });

        if (!existingPost) throw new Error("Post not found");
        if (existingPost.userId !== user.id) throw new Error("Unauthorized: You can only edit your own posts");

        // Update post
        await db.update(communityPosts)
            .set({
                title: input.title,
                content: input.content,
                updatedAt: new Date()
            })
            .where(eq(communityPosts.id, input.postId));

        return { success: true };
    });

// Get Post Details with Comments
export const getPostDetails = protectedProcedure
    .input(z.object({ postId: z.string().uuid() }))
    .handler(async ({ input, context }) => {
        // Return null if postId is empty (initial page load)
        if (!input.postId || input.postId.trim() === '') {
            return null;
        }

        const user = context.session?.user;

        const post = await db.query.communityPosts.findFirst({
            where: eq(communityPosts.id, input.postId),
            with: {
                group: true,
                author: true,
                comments: {
                    with: { author: true },
                    orderBy: [desc(communityComments.createdAt)]
                }
            }
        });

        if (!post) {
            throw new Error("Post not found");
        }

        const isAuthor = user ? post.userId === user.id : false;

        return { ...post, isAuthor };
    });

// Admin only: Delete a group
export const adminDeleteGroup = adminProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .handler(async ({ input }) => {
        // Check if group exists
        const [group] = await db.select().from(communityGroups).where(eq(communityGroups.id, input.groupId));
        if (!group) throw new Error("Group not found");

        // Delete group members first (though FK should handle it if set to cascade, but let's be explicit if needed or trust DB)
        await db.delete(communityGroupMembers).where(eq(communityGroupMembers.groupId, input.groupId));

        // Delete group posts (and their comments)
        const posts = await db.select({ id: communityPosts.id }).from(communityPosts).where(eq(communityPosts.groupId, input.groupId));
        for (const post of posts) {
            await db.delete(communityComments).where(eq(communityComments.postId, post.id));
        }
        await db.delete(communityPosts).where(eq(communityPosts.groupId, input.groupId));

        // Delete the group
        await db.delete(communityGroups).where(eq(communityGroups.id, input.groupId));

        return { success: true };
    });

// Admin only: Update a group
export const adminUpdateGroup = adminProcedure
    .input(z.object({
        groupId: z.string().uuid(),
        name: z.string().min(3),
        description: z.string().optional(),
        iconUrl: z.string().optional()
    }))
    .handler(async ({ input }) => {
        await db.update(communityGroups)
            .set({
                name: input.name,
                description: input.description,
                iconUrl: input.iconUrl,
            })
            .where(eq(communityGroups.id, input.groupId));

        return { success: true };
    });

// Admin only: List all posts across all groups for moderation
export const adminListAllPosts = adminProcedure
    .handler(async () => {
        const posts = await db.select({
            id: communityPosts.id,
            title: communityPosts.title,
            content: communityPosts.content,
            createdAt: communityPosts.createdAt,
            groupName: communityGroups.name,
            authorName: userTable.name,
            authorId: communityPosts.userId,
            commentsCount: sql<number>`(SELECT count(*) FROM ${communityComments} WHERE ${communityComments.postId} = ${communityPosts.id})`.mapWith(Number)
        })
            .from(communityPosts)
            .leftJoin(communityGroups, eq(communityPosts.groupId, communityGroups.id))
            .leftJoin(userTable, eq(communityPosts.userId, userTable.id))
            .orderBy(desc(communityPosts.createdAt));

        return posts;
    });

// Admin only: Delete a post
export const adminDeletePost = adminProcedure
    .input(z.object({ postId: z.string().uuid() }))
    .handler(async ({ input }) => {
        // Delete comments first
        await db.delete(communityComments).where(eq(communityComments.postId, input.postId));
        // Delete post
        await db.delete(communityPosts).where(eq(communityPosts.id, input.postId));

        return { success: true };
    });

// Admin only: Delete a comment
export const adminDeleteComment = adminProcedure
    .input(z.object({ commentId: z.string().uuid() }))
    .handler(async ({ input }) => {
        await db.delete(communityComments).where(eq(communityComments.id, input.commentId));
        return { success: true };
    });

// Admin only: List members of a group
export const adminListGroupMembers = adminProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .handler(async ({ input }) => {
        const members = await db.select({
            id: userTable.id,
            name: userTable.name,
            email: userTable.email,
            canComment: userTable.canComment,
            joinedAt: communityGroupMembers.joinedAt
        })
            .from(communityGroupMembers)
            .leftJoin(userTable, eq(communityGroupMembers.userId, userTable.id))
            .where(eq(communityGroupMembers.groupId, input.groupId))
            .orderBy(desc(communityGroupMembers.joinedAt));

        return members;
    });

// Admin only: Toggle commenting permission for a user
export const adminToggleCommentPermission = adminProcedure
    .input(z.object({ userId: z.string() }))
    .handler(async ({ input }) => {
        const [targetUser] = await db.select().from(userTable).where(eq(userTable.id, input.userId));
        if (!targetUser) throw new Error("User not found");

        await db.update(userTable)
            .set({ canComment: !targetUser.canComment })
            .where(eq(userTable.id, input.userId));

        return { success: true, canComment: !targetUser.canComment };
    });
