import { db } from "@chi-and-rose/db";
import * as schema from "@chi-and-rose/db/schema/auth";
import { env } from "@chi-and-rose/env/server";
import { polar, checkout, portal } from "@polar-sh/better-auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer, emailOTP } from "better-auth/plugins";

import { polarClient } from "./lib/payments";
export { sendEmail } from "./lib/email";
import { sendEmail } from "./lib/email";

export const auth = betterAuth({
  logging: {
    level: "debug",
  },
  onNodeInit: async () => {
    console.log(`[Auth Package] Better-Auth Initialized with baseURL: ${env.BETTER_AUTH_URL}/api/auth`);
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
      },
    },
  },
  // baseURL: `${env.BETTER_AUTH_URL}/api/auth`,
  // Better Auth baseURL is usually strict, but we can make it more flexible in dev
  // by using the provided env or defaulting. If we need to support multiple IPs (like 10.0.2.2),
  // Better Auth 1.1+ can sometimes handle it if trustedOrigins are set, 
  // but for earlier versions, baseURL must match the request.
  baseURL: `${env.BETTER_AUTH_URL}/api/auth`,
  // basePath is NOT needed here - Express mounting path IS the basePath
  database: drizzleAdapter(db, {
    provider: "pg",

    schema: schema,
  }),
  trustedOrigins: [
    env.CORS_ORIGIN,
    "chiandrose://",
    "chiandrose://app",
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://10.0.2.2:3000",
    "http://0.0.0.0:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3001"
  ],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true, // Enable verification so OTP is required
    async sendResetPassword(data, request) {
      await sendEmail({
        to: data.user.email, // Fixed type access
        subject: "Reset your password",
        text: `Click the link to reset your password: ${data.url}`,
      });
    },
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID || "",
      clientSecret: env.GOOGLE_CLIENT_SECRET || "",
      enabled: !!env.GOOGLE_CLIENT_ID,
    },
    apple: {
      clientId: env.APPLE_CLIENT_ID || "",
      clientSecret: env.APPLE_CLIENT_SECRET || "",
      enabled: !!env.APPLE_CLIENT_ID,
    },
  },
  // This is SEPARATE from Google Play/App Store purchase verification
  advanced: {
    defaultCookieAttributes: {
      sameSite: env.NODE_ENV === "production" ? "none" : "lax",
      secure: env.NODE_ENV === "production" || env.BETTER_AUTH_URL.startsWith("https"),
      httpOnly: true,
    },
  },
  plugins: [
    {
      id: "auto-admin",
      schema: {
        user: {
          fields: {
            role: { type: "string" }
          }
        }
      },
      hooks: {
        user: {
          create: {
            before: async (user) => {
              if (env.ADMIN_EMAIL) {
                const adminEmails = env.ADMIN_EMAIL.split(",").map((e) => e.trim().toLowerCase());
                if (adminEmails.includes(user.email.toLowerCase())) {
                  console.log(`[Auth] Auto-promoting ${user.email} to admin`);
                  return {
                    data: {
                      ...user,
                      role: "admin",
                    }
                  }
                }
              }
            }
          }
        }
      }
    } as any,
    bearer(),
    emailOTP({
      otpLength: 4, // Set to 4 digits as per user requirement
      async sendVerificationOTP({ email, otp, type }) {
        console.log("👉 [DEBUG] sendVerificationOTP Fired!", { email, otp, type });
        try {
          await sendEmail({
            to: email,
            subject: "Verify your email",
            text: `Your verification code is: ${otp}`,
          });
          console.log("👉 [DEBUG] sendEmail completed");
        } catch (err) {
          console.error("❌ [DEBUG] sendEmail failed:", err);
        }
      },
    }),
    polar({
      client: polarClient,
      createCustomerOnSignUp: false, // Disabled to prevent blocking sign-up errors
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
