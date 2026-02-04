import { z } from "zod";
import { db, articles, dailyTips } from "@chi-and-rose/db";
import { eq, desc } from "drizzle-orm";
import { adminProcedure } from "../index";

// Schemas
// Simplified schema to ensure basic functionality first
const articleSchema = z.object({
    title: z.string(),
    content: z.string(),
    summary: z.string().optional(),
    imageUrl: z.string().optional(),
    category: z.string(),
    isPublished: z.boolean().default(false),
    publishedAt: z.string().nullish().optional(),
});

const tipSchema = z.object({
    phase: z.string().min(1),
    content: z.string().min(1),
    actionableTip: z.string().optional(),
    category: z.string().optional(),
});

export const listArticles = adminProcedure
    .output(z.array(z.object({
        id: z.string(),
        title: z.string(),
        category: z.string(),
        isPublished: z.boolean(),
        createdAt: z.date(),
    })))
    .handler(async () => {
        return await db.select().from(articles).orderBy(desc(articles.createdAt));
    });

export const getArticle = adminProcedure
    .input(z.object({ id: z.string() }))
    .output(z.object({
        id: z.string(),
        title: z.string(),
        content: z.string(),
        summary: z.string().nullable().optional(),
        imageUrl: z.string().nullable().optional(),
        category: z.string(),
        isPublished: z.boolean(),
        // Dates can be strings or Date objects depending on serialization, usually Date from DB
        createdAt: z.date(),
        updatedAt: z.date(),
        publishedAt: z.date().nullable().optional(),
    }))
    .handler(async ({ input }) => {
        console.log("getArticle input:", input);
        const [article] = await db.select().from(articles).where(eq(articles.id, input.id));
        console.log("getArticle result:", article ? "Found" : "Not Found");
        if (!article) {
            throw new Error("Article not found");
        }
        return article;
    });

export const createArticle = adminProcedure
    .input(articleSchema)
    .handler(async ({ input }) => {
        // Handle date conversion safely
        let pubDate: Date | null = null;
        if (input.publishedAt) {
            pubDate = new Date(input.publishedAt);
        }

        await db.insert(articles).values({
            ...input,
            publishedAt: pubDate,
            imageUrl: input.imageUrl || null,
        });
        return { success: true };
    });

export const updateArticle = adminProcedure
    .input(articleSchema.extend({ id: z.string() }))
    .handler(async ({ input }) => {
        console.log("updateArticle input:", input);
        console.log("updateArticle isPublished:", input.isPublished);
        const { id, ...data } = input;

        let pubDate: Date | null = null;
        if (data.publishedAt) {
            pubDate = new Date(data.publishedAt);
        }

        await db.update(articles).set({
            ...data,
            publishedAt: pubDate,
            imageUrl: data.imageUrl || null,
            updatedAt: new Date(),
        }).where(eq(articles.id, id));
        return { success: true };
    });

export const deleteArticle = adminProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
        await db.delete(articles).where(eq(articles.id, input.id));
        return { success: true };
    });


// --- Tips ---

export const listTips = adminProcedure
    .handler(async () => {
        return await db.select().from(dailyTips).orderBy(desc(dailyTips.createdAt));
    });

export const getTip = adminProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
        const [tip] = await db.select().from(dailyTips).where(eq(dailyTips.id, input.id));
        return tip;
    });

export const createTip = adminProcedure
    .input(tipSchema)
    .handler(async ({ input }) => {
        await db.insert(dailyTips).values(input);
        return { success: true };
    });

export const updateTip = adminProcedure
    .input(tipSchema.extend({ id: z.string() }))
    .handler(async ({ input }) => {
        const { id, ...data } = input;
        await db.update(dailyTips).set({ ...data, updatedAt: new Date() }).where(eq(dailyTips.id, id));
        return { success: true };
    });

export const deleteTip = adminProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
        await db.delete(dailyTips).where(eq(dailyTips.id, input.id));
        return { success: true };
    });
