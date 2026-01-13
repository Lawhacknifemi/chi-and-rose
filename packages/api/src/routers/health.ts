import { z } from "zod";
import { db, userProfiles } from "@chi-and-rose/db";
import { eq } from "drizzle-orm";
import { protectedProcedure } from "../index";

const profileSchema = z.object({
    conditions: z.array(z.string()),
    symptoms: z.array(z.string()),
    goals: z.array(z.string()),
    dietaryPreferences: z.array(z.string()),
    sensitivities: z.array(z.string()),
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
        const existing = await db.query.userProfiles.findFirst({
            where: eq(userProfiles.userId, context.session.user.id),
        });

        if (existing) {
            await db
                .update(userProfiles)
                .set({
                    ...input,
                    updatedAt: new Date(),
                })
                .where(eq(userProfiles.userId, context.session.user.id));
        } else {
            await db.insert(userProfiles).values({
                userId: context.session.user.id,
                ...input,
            });
        }

        return { success: true };
    });
