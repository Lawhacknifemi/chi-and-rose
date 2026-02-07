import { getSettings, updateSettings, logPeriodStart, logDailyEntry, getCalendarData } from "../src/routers/flow";
import { db, user } from "@chi-and-rose/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

async function main() {
    console.log("Starting Flow Tracker Verification...");

    // 1. Setup Test User
    const testEmail = "test-flow@example.com";
    let testUser = await db.query.user.findFirst({
        where: eq(user.email, testEmail)
    });

    if (!testUser) {
        console.log("Creating test user...");
        [testUser] = await db.insert(user).values({
            id: crypto.randomUUID(),
            name: "Flow Tester",
            email: testEmail,
            emailVerified: true
        }).returning();
    }

    console.log(`Test User ID: ${testUser.id}`);

    // 2. Mock Context
    const context = {
        session: {
            user: {
                id: testUser.id,
                email: testUser.email,
                name: testUser.name,
                image: testUser.image,
                role: "user"
            },
            session: {
                id: "mock-session-id",
                userId: testUser.id,
                expiresAt: new Date(Date.now() + 100000),
                token: "mock-token",
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        }
    };

    try {
        // 3. Test getSettings (initial)
        console.log("\n--- Testing getSettings (Initial) ---");
        // @ts-ignore
        // Trying pattern: const fn = procedure.callable(context); const res = await fn(input);
        const getSettingsFn = getSettings.callable({ context });
        console.log("getSettingsFn type:", typeof getSettingsFn);

        // @ts-ignore
        const initialSettings = await getSettingsFn(undefined);
        console.log("Initial Settings:", initialSettings);

        // 4. Test updateSettings
        console.log("\n--- Testing updateSettings ---");
        // @ts-ignore
        const updateSettingsFn = updateSettings.callable({ context });
        await updateSettingsFn({
            averageCycleLength: 30,
            averagePeriodLength: 6
        });

        // @ts-ignore
        const updatedSettings = await getSettingsFn(undefined);
        console.log("Updated Settings:", updatedSettings);
        if (updatedSettings.averageCycleLength !== 30) throw new Error("Settings update failed!");

        // 5. Test logPeriodStart
        console.log("\n--- Testing logPeriodStart ---");
        const today = new Date().toISOString().split('T')[0];
        // @ts-ignore
        const logPeriodStartFn = logPeriodStart.callable({ context });
        await logPeriodStartFn({ date: today });
        console.log(`Logged period start for: ${today}`);

        const settingsAfterStart = await getSettingsFn(undefined);
        console.log("Settings after start:", settingsAfterStart);
        if (!settingsAfterStart.lastPeriodStart) throw new Error("lastPeriodStart not updated!");

        // 6. Test logDailyEntry
        console.log("\n--- Testing logDailyEntry ---");
        // @ts-ignore
        const logDailyEntryFn = logDailyEntry.callable({ context });
        await logDailyEntryFn({
            date: today,
            flowIntensity: "medium",
            symptoms: ["cramps", "bloating"],
            mood: "tired",
            notes: "Test note"
        });
        console.log("Daily entry logged.");

        // 7. Test getCalendarData
        console.log("\n--- Testing getCalendarData ---");
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        // @ts-ignore
        const getCalendarDataFn = getCalendarData.callable({ context });
        const calendarData = await getCalendarDataFn({
            month: currentMonth,
            year: currentYear
        });

        console.log(`Calendar Data for ${currentMonth}/${currentYear}:`);
        console.log("# Cycles:", calendarData.cycles.length);
        console.log("# Logs:", calendarData.logs.length);

        if (calendarData.logs.length === 0) throw new Error("No logs found!");
        if (calendarData.cycles.length === 0) throw new Error("No cycles found!");

        console.log("\n✅ Verification SUCCESS!");

    } catch (error) {
        console.error("\n❌ Verification FAILED:", error);
        console.error(error);
    }
}

main().then(() => process.exit(0));
