import { db } from "@chi-and-rose/db";
import * as schema from "@chi-and-rose/db/schema/auth";
import { env } from "@chi-and-rose/env/server";
import { polar, checkout, portal } from "@polar-sh/better-auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";

import { polarClient } from "./lib/payments";
import { sendEmail } from "./lib/email";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL.endsWith("/api/auth") ? env.BETTER_AUTH_URL : `${env.BETTER_AUTH_URL}/api/auth`,
  // basePath is NOT needed here - Express mounting path IS the basePath
  database: drizzleAdapter(db, {
    provider: "pg",

    schema: schema,
  }),
  trustedOrigins: [env.CORS_ORIGIN],
  emailAndPassword: {
    enabled: true,
    async sendResetPassword(data, request) {
      await sendEmail({
        to: data.user.email,
        subject: "Reset your password",
        text: `Click the link to reset your password: ${data.url}`,
      });
    },
  },
  // Note: OAuth providers (Google, Apple) can be added here when needed
  // These are for authentication (signing in with Google/Apple accounts)
  // This is SEPARATE from Google Play/App Store purchase verification
  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax", // Changed from "none" for better localhost support
      secure: env.NODE_ENV === "production", // Only use secure in production (HTTPS)
      httpOnly: true,
    },
  },
  plugins: [
    bearer(),
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      enableCustomerPortal: true,
      use: env.POLAR_PRODUCT_ID
        ? [
          checkout({
            products: [
              {
                productId: env.POLAR_PRODUCT_ID,
                slug: "pro",
              },
            ],
            successUrl: env.POLAR_SUCCESS_URL,
            authenticatedUsersOnly: true,
          }),
          portal(),
        ]
        : [portal()],
    }),
  ],
});
