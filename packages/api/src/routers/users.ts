import { z } from "zod";
import { db, user } from "@chi-and-rose/db";
import { desc, eq } from "drizzle-orm";
import { adminProcedure } from "../index";

export const listUsers = adminProcedure
    .output(z.array(z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        role: z.string(),
        isSuspended: z.boolean(),
        canComment: z.boolean(),
        plan: z.string(),
        createdAt: z.date(),
    })))
    .handler(async () => {
        return await db.select({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isSuspended: user.isSuspended,
            canComment: user.canComment,
            plan: user.plan,
            createdAt: user.createdAt,
        })
            .from(user)
            .orderBy(desc(user.createdAt));
    });

export const toggleSuspension = adminProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
        const [targetUser] = await db.select().from(user).where(eq(user.id, input.id));
        if (!targetUser) {
            throw new Error("User not found");
        }
        await db.update(user)
            .set({ isSuspended: !targetUser.isSuspended })
            .where(eq(user.id, input.id));
        return { success: true, isSuspended: !targetUser.isSuspended };
    });

export const updateUserPlan = adminProcedure
    .input(z.object({ id: z.string(), plan: z.enum(["free", "pro"]) }))
    .handler(async ({ input }) => {
        await db.update(user)
            .set({ plan: input.plan })
            .where(eq(user.id, input.id));
        return { success: true, plan: input.plan };
    });

export const deleteUser = adminProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
        await db.delete(user).where(eq(user.id, input.id));
        return { success: true };
    });
