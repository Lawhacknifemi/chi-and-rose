
import { protectedProcedure } from "../index";
import { db, scans, productsCache, userProfiles, desc, eq } from "@chi-and-rose/db";
import { aiService } from "../services/ai";

export const getFeed = protectedProcedure
    .handler(async ({ context }) => {
        const userId = context.session.user.id;
        console.log(`[discover/getFeed] Fetching for User: ${userId}`);
        const recentScans = await db.select({
            name: productsCache.name,
            brand: productsCache.brand,
            category: productsCache.category,
        })
            .from(scans)
            .innerJoin(productsCache, eq(scans.barcode, productsCache.barcode))
            .where(eq(scans.userId, userId))
            .orderBy(desc(scans.createdAt))
            .limit(10);

        if (recentScans.length === 0) {
            console.log(`[discover/getFeed] No recent scans found for user ${userId}.`);
            return { recommendations: [] };
        }
        console.log(`[discover/getFeed] Found ${recentScans.length} recent scans. Generating recommendations...`);

        // 2. Get User Profile Context
        const profile = await db.query.userProfiles.findFirst({
            where: eq(userProfiles.userId, userId)
        });

        let profileContext = "General health-conscious user.";
        if (profile) {
            profileContext = `
            Conditions: ${profile.conditions?.join(", ") || "None"}
            Sensitivities: ${profile.sensitivities?.join(", ") || "None"}
            Diet: ${profile.dietaryPreferences?.join(", ") || "None"}
            `;
        }

        // 3. Generate Recommendations
        const recommendations = await aiService.getRecommendations(recentScans as any[], profileContext);
        console.log(`[discover/getFeed] Returning ${recommendations.length} recommendations.`);

        return { recommendations };
    });
