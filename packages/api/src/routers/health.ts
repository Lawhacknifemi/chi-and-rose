import { z } from "zod";
import { db, userProfiles, articles, eq } from "@chi-and-rose/db";
import { desc } from "drizzle-orm";
import { protectedProcedure } from "../index";
import { aiService } from "../services/ai";

const profileSchema = z.object({
    conditions: z.array(z.string()),
    symptoms: z.array(z.string()),
    goals: z.array(z.string()),
    dietaryPreferences: z.array(z.string()),
    sensitivities: z.array(z.string()),
    dateOfBirth: z.string().or(z.date()).optional(),
});

export const getProfile = protectedProcedure
    .input(z.object({}))
    .handler(async ({ context }) => {
        const profile = await db.query.userProfiles.findFirst({
            where: eq(userProfiles.userId, context.session.user.id),
        });
        return profile || null;
    });

export const updateProfile = protectedProcedure
    .input(profileSchema)
    .handler(async ({ input, context }) => {
        try {
            console.log("[Health API] Updating profile for user:", context.session.user.id);
            console.log("[Health API] Input:", JSON.stringify(input));

            const existing = await db.query.userProfiles.findFirst({
                where: eq(userProfiles.userId, context.session.user.id),
            });

            const profileData = {
                ...input,
                dateOfBirth: typeof input.dateOfBirth === "string"
                    ? new Date(input.dateOfBirth)
                    : input.dateOfBirth,
            };

            if (existing) {
                console.log("[Health API] Profile exists, updating...");
                await db
                    .update(userProfiles)
                    .set({
                        ...profileData,
                        updatedAt: new Date(),
                    })
                    .where(eq(userProfiles.userId, context.session.user.id));
            } else {
                console.log("[Health API] creating new profile...");
                await db.insert(userProfiles).values({
                    userId: context.session.user.id,
                    ...profileData,
                });
            }

            console.log("[Health API] Update successful.");
            return { success: true };
        } catch (error) {
            console.error("[Health API] CRITICAL ERROR:", error);
            console.error("Logging error to console instead of file:", error);
            throw error;
        }
    });

export const dailyInsight = protectedProcedure
    .output(
        z.object({
            title: z.string(),
            message: z.string(),
            actionableTip: z.string(),
        })
    )
    .handler(async ({ context }) => {
        const userId = context.session.user.id;
        const profile = await db.query.userProfiles.findFirst({
            where: eq(userProfiles.userId, userId),
        });

        if (!profile) {
            return {
                title: "Welcome!",
                message: "Complete your health profile to get daily personalized insights.",
                actionableTip: "Go to the Profile tab to set up your preferences.",
            };
        }

        const profileContext = `
            Goals: ${profile.goals.join(", ")}
            Dietary Preferences: ${profile.dietaryPreferences.join(", ")}
            Conditions: ${profile.conditions.join(", ")}
            Symptoms: ${profile.symptoms.join(", ")}
        `;

        return await aiService.generateDailyInsight(profileContext);

    });

export const getFeed = protectedProcedure
    .output(
        z.array(z.object({
            id: z.string(),
            title: z.string(),
            category: z.string(),
            imageUrl: z.string(),
            readTime: z.string(),
        }))
    )
    .handler(async () => {
        console.log("Health: getFeed called");
        // Fetch published articles
        const publishedArticles = await db
            .select()
            .from(articles)
            .where(eq(articles.isPublished, true))
            .orderBy(desc(articles.createdAt))
            .limit(10); // Limit to 10 for now
        const mapped = publishedArticles.map((article) => {
            // Calculate read time (approx 200 words per minute)
            const wordCount = article.content ? article.content.split(/\s+/).length : 0;
            const readTimeMinutes = Math.ceil(wordCount / 200);
            const readTime = readTimeMinutes < 1 ? "1 min read" : `${readTimeMinutes} min read`;

            return {
                id: article.id,
                title: article.title,
                category: article.category,
                imageUrl: article.imageUrl || "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80&w=800", // Fallback image
                readTime: readTime,
            };
        });

        console.log(`Health: Returning ${mapped.length} articles`);
        return mapped;
    });

export const getArticle = protectedProcedure
    .input(z.object({ id: z.string() }))
    .output(z.object({
        id: z.string(),
        title: z.string(),
        content: z.string(),
        summary: z.string().nullable().optional(),
        imageUrl: z.string().nullable().optional(),
        category: z.string(),
        readTime: z.string(),
        publishedAt: z.date().nullable().optional(),
    }))
    .handler(async ({ input }) => {
        const [article] = await db
            .select()
            .from(articles)
            .where(eq(articles.id, input.id));

        if (!article) {
            throw new Error("Article not found");
        }

        // Calculate read time
        const wordCount = article.content ? article.content.split(/\s+/).length : 0;
        const readTimeMinutes = Math.ceil(wordCount / 200);
        const readTime = readTimeMinutes < 1 ? "1 min read" : `${readTimeMinutes} min read`;

        return {
            id: article.id,
            title: article.title,
            content: article.content,
            summary: article.summary,
            imageUrl: article.imageUrl || "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80&w=800",
            category: article.category,
            readTime: readTime,
            publishedAt: article.publishedAt,
        };
    });
