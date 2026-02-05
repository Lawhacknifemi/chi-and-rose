
import { z } from "zod";
import { protectedProcedure } from "../trpc"; // Using alias or relative path to trpc setup
import { os } from "@orpc/server";
import { db } from "@chi-and-rose/db";
import { communityGroups, communityPosts, communityComments } from "@chi-and-rose/db/schema/community";
import { user } from "@chi-and-rose/db/schema/auth";
import { eq, desc } from "drizzle-orm";

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

export const communityRouter = os.router({
    // Get all available groups
    getGroups: protectedProcedure
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
        }),

    // Get Community Feed (Latest posts across all groups)
    getFeed: protectedProcedure
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
            // Fetch posts with author and group details
            const posts = await db.query.communityPosts.findMany({
                orderBy: [desc(communityPosts.createdAt)],
                limit: 20,
                with: {
                    group: true,
                    author: true
                }
            });

            return posts.map(post => ({
                ...post,
                group: post.group ? { id: post.group.id, name: post.group.name } : null,
                author: post.author ? { id: post.author.id, name: post.author.name, image: post.author.image } : null
            }));
        }),

    // Create a new post
    createPost: protectedProcedure
        .input(createPostSchema)
        .handler(async ({ input, ctx }) => {
            const { user } = ctx; // Access authenticated user from context

            await db.insert(communityPosts).values({
                groupId: input.groupId,
                userId: user.id,
                title: input.title,
                content: input.content,
                imageUrl: input.imageUrl
            });

            return { success: true };
        }),

    // Get Post Details with Comments
    getPostDetails: protectedProcedure
        .input(z.object({ postId: z.string().uuid() }))
        .handler(async ({ input }) => {
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

            return post;
        }),

    // Create a comment
    createComment: protectedProcedure
        .input(createCommentSchema)
        .handler(async ({ input, ctx }) => {
            const { user } = ctx;

            await db.insert(communityComments).values({
                postId: input.postId,
                userId: user.id,
                content: input.content
            });

            // Increment comment count on post (optional optimization)
            // await db.update(communityPosts).set({ commentsCount: sql`${communityPosts.commentsCount} + 1` }).where(eq(communityPosts.id, input.postId));

            return { success: true };
        })
});
