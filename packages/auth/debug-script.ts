
import dotenv from "dotenv";
import { toNodeHandler } from "better-auth/node";

// Load env vars but EXCLUDE Google ID
const envConfig = dotenv.config({ path: "apps/server/.env" }).parsed || {};
// Manually apply to process.env
for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

// SIMULATE MISSING CLIENT SECRET
delete process.env.GOOGLE_CLIENT_SECRET;

async function main() {
    console.log("--- Starting Auth Debug Script (Simulation: Missing Client Secret) ---");

    // Import Auth AFTER modifying env
    const { auth } = await import("./src/index");

    console.log("1. Checking Environment Variables...");
    console.log("GOOGLE_CLIENT_ID present:", !!process.env.GOOGLE_CLIENT_ID);
    console.log("BETTER_AUTH_URL:", process.env.BETTER_AUTH_URL);

    console.log("2. Inspecting Auth Options...");
    const options = auth.options;
    console.log("Social Providers Config:", JSON.stringify(options.socialProviders, null, 2));

    console.log("3. Simulating POST /api/auth/sign-in/social request...");
    // Mock a request object (resembling Express properties used by toNodeHandler)
    const mockReq = new Request("http://localhost:3000/api/auth/sign-in/social", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            provider: "google",
            callbackURL: "http://localhost:3000/login/success"
        })
    });

    try {
        const handler = toNodeHandler(auth);

        console.log("   Calling auth.api.signInSocial...");
        const result = await auth.api.signInSocial({
            body: {
                provider: "google",
                callbackURL: "http://localhost:3000/login/success"
            },
            asResponse: true // Setup to return response object
        }, {
            headers: new Headers()
        });

        console.log("   Result Status:", result?.status);
        if (result) {
            console.log("   Result Body:", await result.text());
        }

    } catch (error) {
        console.error("CRITICAL ERROR during Sign In:", error);
    }
}

main().catch(console.error);
