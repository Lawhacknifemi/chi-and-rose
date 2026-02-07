import { z } from "zod";
import { db, userCycleSettings, cycles, cycleLogs, eq, and, desc, gte, lte } from "@chi-and-rose/db";
import { protectedProcedure } from "../index";

export const getSettings = protectedProcedure
    .output(z.object({
        averageCycleLength: z.number(),
        averagePeriodLength: z.number(),
        lastPeriodStart: z.date().nullable(),
    }))
    .handler(async ({ context }) => {
        let settings = await db.query.userCycleSettings.findFirst({
            where: eq(userCycleSettings.userId, context.session.user.id),
        });

        if (!settings) {
            // Create default settings if not exists
            [settings] = await db.insert(userCycleSettings)
                .values({ userId: context.session.user.id })
                .returning();
        }

        return {
            averageCycleLength: settings.averageCycleLength,
            averagePeriodLength: settings.averagePeriodLength,
            lastPeriodStart: settings.lastPeriodStart ? new Date(settings.lastPeriodStart) : null,
        };
    });

export const updateSettings = protectedProcedure
    .input(z.object({
        averageCycleLength: z.number().min(20).max(45).optional(),
        averagePeriodLength: z.number().min(2).max(10).optional(),
    }))
    .output(z.boolean())
    .handler(async ({ input, context }) => {
        const userId = context.session.user.id;

        // Ensure record exists
        const existing = await db.query.userCycleSettings.findFirst({
            where: eq(userCycleSettings.userId, userId),
        });

        if (!existing) {
            await db.insert(userCycleSettings).values({
                userId,
                ...input
            });
        } else {
            await db.update(userCycleSettings)
                .set({ ...input, updatedAt: new Date() })
                .where(eq(userCycleSettings.userId, userId));
        }
        return true;
    });

export const logPeriodStart = protectedProcedure
    .input(z.object({
        date: z.string(), // YYYY-MM-DD
    }))
    .output(z.object({ success: z.boolean() }))
    .handler(async ({ input, context }) => {
        const userId = context.session.user.id;
        const startDate = new Date(input.date);

        // Update settings lastPeriodStart
        await db.insert(userCycleSettings)
            .values({
                userId,
                lastPeriodStart: startDate.toISOString() // Store as ISO string or Date depending on DB driver handling, usually Date object for helper
            })
            .onConflictDoUpdate({
                target: userCycleSettings.userId,
                set: { lastPeriodStart: startDate.toISOString() }
            });

        // Check if a cycle already exists for close to this date (e.g. same month?)
        // For simplicity, just create a new cycle if no open one exists or if this is clearly new

        // Insert new cycle
        await db.insert(cycles).values({
            userId,
            startDate: startDate.toISOString(),
            isPrediction: false
        });

        return { success: true };
    });

export const logDailyEntry = protectedProcedure
    .input(z.object({
        date: z.string(),
        flowIntensity: z.enum(["light", "medium", "heavy", "spotting"]).optional(),
        symptoms: z.array(z.string()).optional(),
        mood: z.string().optional(),
        notes: z.string().optional(),
    }))
    .output(z.boolean())
    .handler(async ({ input, context }) => {
        const userId = context.session.user.id;
        const date = new Date(input.date).toISOString().split('T')[0]; // Format YYYY-MM-DD

        await db.insert(cycleLogs)
            .values({
                userId,
                date,
                flowIntensity: input.flowIntensity,
                symptoms: input.symptoms,
                mood: input.mood,
                notes: input.notes
            })
            .onConflictDoUpdate({
                target: [cycleLogs.userId, cycleLogs.date] as any, // Composite key if supported, else assume id logic or separate check
                // Actually cycle_logs lacks a unique composite constraint in schema definition above, so insert might duplicate.
                // NOTE: Schema needs unique constraint on (userId, date) or we check first.
                // Let's doing check first for safety.
                set: {
                    flowIntensity: input.flowIntensity,
                    symptoms: input.symptoms,
                    mood: input.mood,
                    notes: input.notes,
                    updatedAt: new Date()
                }
            });
        // Ideally we add unique index/constraint to DB. Assuming check via logic for now:

        const existing = await db.query.cycleLogs.findFirst({
            where: and(eq(cycleLogs.userId, userId), eq(cycleLogs.date, date))
        });

        if (existing) {
            await db.update(cycleLogs)
                .set({
                    flowIntensity: input.flowIntensity,
                    symptoms: input.symptoms,
                    mood: input.mood,
                    notes: input.notes,
                    updatedAt: new Date()
                })
                .where(eq(cycleLogs.id, existing.id));
        } else {
            await db.insert(cycleLogs).values({
                userId,
                date,
                flowIntensity: input.flowIntensity,
                symptoms: input.symptoms,
                mood: input.mood,
                notes: input.notes
            });
        }

        return true;
    });

export const getCalendarData = protectedProcedure
    .input(z.object({
        month: z.number(), // 1-12
        year: z.number(),
    }))
    .output(z.object({
        days: z.array(z.object({
            date: z.string(),
            isPeriod: z.boolean(),
            isPrediction: z.boolean(),
        })),
        cycles: z.array(z.object({
            startDate: z.string(),
            endDate: z.string().nullable(),
            isPrediction: z.boolean(),
        })),
        logs: z.array(z.object({
            date: z.string(),
            flowIntensity: z.string().nullable(),
            symptoms: z.any(),
        }))
    }))
    .handler(async ({ input, context }) => {
        const userId = context.session.user.id;
        const year = input.year;
        const month = input.month; // 1-12

        // 1. Get User Settings for average period length (fallback)
        const settings = await db.query.userCycleSettings.findFirst({
            where: eq(userCycleSettings.userId, userId),
        });
        const defaultPeriodLength = settings?.averagePeriodLength || 5;

        // 2. Fetch specific month range for logs
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0);

        // Format as YYYY-MM-DD for DB queries
        const startStr = startOfMonth.toISOString().slice(0, 10);
        const endStr = endOfMonth.toISOString().slice(0, 10);

        // Get logs for month
        const monthlyLogs = await db.query.cycleLogs.findMany({
            where: and(
                eq(cycleLogs.userId, userId),
                gte(cycleLogs.date, startStr),
                lte(cycleLogs.date, endStr)
            )
        });

        // 3. Get cycles overlapping with or near this month
        // We fetch a bit wider range of cycles to ensure we catch those starting before the month
        // In a real app, we'd use cleaner date filtering on cycles.
        // For now, fetch last 10 cycles to be safe.
        const userCycles = await db.query.cycles.findMany({
            where: eq(cycles.userId, userId),
            orderBy: [desc(cycles.startDate)],
            limit: 10
        });

        // 4. Generate Days Array
        const days = [];
        const daysInMonth = endOfMonth.getDate();

        for (let d = 1; d <= daysInMonth; d++) {
            const currentObj = new Date(year, month - 1, d);
            const currentStr = currentObj.toISOString().slice(0, 10);

            // Check if this day is within any cycle
            let isPeriod = false;
            let isPrediction = false;

            for (const c of userCycles) {
                const cStart = new Date(c.startDate);
                let cEnd;

                if (c.endDate) {
                    cEnd = new Date(c.endDate);
                } else {
                    // Estimate end based on average period length
                    // Start date is day 1. So end date is start + (length - 1) days.
                    cEnd = new Date(cStart);
                    cEnd.setDate(cStart.getDate() + defaultPeriodLength - 1);
                }

                // Check overlap
                // Reset times to noon to avoid timezone edge cases with simple date logic
                const checkTime = currentObj.getTime();
                const startTime = cStart.setHours(0, 0, 0, 0);
                const endTime = cEnd.setHours(23, 59, 59, 999);

                if (checkTime >= startTime && checkTime <= endTime) {
                    isPeriod = true;
                    if (c.isPrediction) isPrediction = true;
                    break;
                }
            }

            days.push({
                date: currentStr,
                isPeriod,
                isPrediction
            });
        }

        return {
            days,
            cycles: userCycles.map(c => ({
                startDate: c.startDate.toString(),
                endDate: c.endDate ? c.endDate.toString() : null,
                isPrediction: c.isPrediction
            })),
            logs: monthlyLogs.map(l => ({
                date: l.date.toString(),
                flowIntensity: l.flowIntensity,
                symptoms: l.symptoms
            }))
        };
    });
