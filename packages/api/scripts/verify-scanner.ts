
import { db, userProfiles } from "@chi-and-rose/db";
import { EvaluationEngine } from "../src/lib/engine/evaluation";
import { eq } from "drizzle-orm";

// Mock User ID for testing (ensure this user exists or use a random one if we mock the DB call)
// For this script, we'll try to find the 'admin' user or create a temporary one, 
// OR we can just mock the DB call in the engine if we were running a unit test.
// But since this is a run-script, let's use the real DB.

async function main() {
    console.log("--- Starting Scanner Verification ---");

    // 1. Setup Test User Profile
    // We'll assume a user exists. Let's look for one.
    const users = await db.query.user.findMany({ limit: 1 });
    if (users.length === 0) {
        console.error("No users found to test with.");
        process.exit(1);
    }
    const TEST_USER_ID = users[0].id; // Use the first available user
    console.log(`Using Test User ID: ${TEST_USER_ID}`);

    // Update their profile to have "Endometriosis"
    console.log("Setting user condition to 'Endometriosis'...");
    await db
        .insert(userProfiles)
        .values({
            userId: TEST_USER_ID,
            conditions: ["Endometriosis"],
            symptoms: [],
            goals: [" hormone balance "],
            dietaryPreferences: [],
            sensitivities: [],
        })
        .onConflictDoUpdate({
            target: userProfiles.userId,
            set: {
                conditions: ["Endometriosis"],
            },
        });

    // 2. Test Analysis with a Harmful Product (Parabens)
    console.log("\n--- Test Case 1: Product with Parabens (Endocrine Disruptor) ---");
    const harmfulIngredients = ["water", "glycerin", "methylparaben", "propyleparaben", "fragrance"];

    console.log("Analyzing ingredients:", harmfulIngredients);
    const resultbad = await EvaluationEngine.analyze(
        TEST_USER_ID,
        harmfulIngredients,
        "Bad Lotion"
    );

    console.log("Result:");
    console.log(`Score: ${resultbad.overallSafetyScore}`);
    console.log(`Safety Level: ${resultbad.safetyLevel}`);
    console.log(`Concerns:`, JSON.stringify(resultbad.concerns, null, 2));

    if (resultbad.safetyLevel === "Avoid" && resultbad.concerns.find(c => c.ingredient === "parabens")) {
        console.log("✅ SUCCESS: Detected Parabens as harmful for Endometriosis.");
    } else {
        console.log("❌ FAILURE: Did not flag Parabens correctly.");
    }

    // 3. Test Analysis with a Safe Product
    console.log("\n--- Test Case 2: Clean Product ---");
    const safeIngredients = ["water", "aloe vera", "shea butter", "jojoba oil"];
    const resultgood = await EvaluationEngine.analyze(
        TEST_USER_ID,
        safeIngredients,
        "Good Cream"
    );
    console.log(`Safety Level: ${resultgood.safetyLevel}`);
    if (resultgood.safetyLevel === "Good") {
        console.log("✅ SUCCESS: Clean product marked as Good.");
    } else {
        console.log("❌ FAILURE: Clean product marked as " + resultgood.safetyLevel);
    }

    console.log("\n--- Verification Complete ---");
    process.exit(0);
}

main().catch(console.error);
