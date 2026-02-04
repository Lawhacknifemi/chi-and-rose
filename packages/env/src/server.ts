import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    POLAR_ACCESS_TOKEN: z.string().min(1),
    POLAR_PRODUCT_ID: z.string().uuid().optional(),
    POLAR_SUCCESS_URL: z.url(),
    CORS_ORIGIN: z.url(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

    // Email (Optional for now, defaults to mock)
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().default("noreply@example.com"),

    // OAuth Authentication (Better-Auth)
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    APPLE_CLIENT_ID: z.string().optional(),
    APPLE_CLIENT_SECRET: z.string().optional(),

    // AI
    GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),

    // Mobile Purchase Verification (Separate from auth)
    GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL: z.string().email().optional(),
    GOOGLE_PLAY_PRIVATE_KEY: z.string().optional(),
    GOOGLE_PLAY_PACKAGE_NAME: z.string().optional(),
    APPLE_APP_SHARED_SECRET: z.string().optional(),
    APPLE_BUNDLE_ID: z.string().optional(),

    // Cloudinary
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
