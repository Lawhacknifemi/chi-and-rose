import { db } from "@chi-and-rose/db";
import * as schema from "@chi-and-rose/db/schema/auth";
import { env } from "@chi-and-rose/env/server";
import { eq } from "drizzle-orm";
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
    if (env.ADMIN_EMAIL) {
      const list = env.ADMIN_EMAIL.split(",").map(e => e.trim());
      console.log(`[Auth:AutoAdmin] Configured Admin Emails: ${list.join(", ")}`);
    } else {
      console.log(`[Auth:AutoAdmin] No ADMIN_EMAIL configured`);
    }
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
    ...env.CORS_ORIGIN.split(",").map(o => o.trim()),
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
      sameSite: "lax",
      secure: env.NODE_ENV === "production" || env.BETTER_AUTH_URL.startsWith("https"),
      httpOnly: true,
    },
  },
  plugins: [
    {
      id: "auto-admin",
      hooks: {
        session: {
          create: {
            after: async (session) => {
              if (env.ADMIN_EMAIL) {
                const adminEmails = env.ADMIN_EMAIL.split(",").map((e) => e.trim().toLowerCase());
                const targetUid = (session as any).userId || (session as any).user?.id;

                if (!targetUid) {
                  console.log(`[Auth:AutoAdmin] session.create: No UID found in session object`);
                  return;
                }

                const users = await db.select()
                  .from(schema.user)
                  .where(eq(schema.user.id, targetUid))
                  .limit(1);

                const userRecord = users[0];
                if (!userRecord) return;

                const userEmail = userRecord.email.toLowerCase().trim();
                console.log(`[Auth:AutoAdmin] session.create: Checking ${userEmail}`);

                if (adminEmails.includes(userEmail) && userRecord.role !== "admin") {
                  console.log(`[Auth:AutoAdmin] session.create: Promoting ${userEmail} to admin`);
                  await db.update(schema.user)
                    .set({ role: "admin" })
                    .where(eq(schema.user.id, userRecord.id));
                }
              }
            }
          },
          set: {
            after: async (session) => {
              if (env.ADMIN_EMAIL) {
                const adminEmails = env.ADMIN_EMAIL.split(",").map((e) => e.trim().toLowerCase());
                const targetUid = (session as any).userId;
                if (!targetUid) return;

                const users = await db.select().from(schema.user).where(eq(schema.user.id, targetUid)).limit(1);
                const ur = users[0];
                if (ur && adminEmails.includes(ur.email.toLowerCase().trim()) && ur.role !== "admin") {
                  console.log(`[Auth:AutoAdmin] session.set: Promoting ${ur.email} to admin`);
                  await db.update(schema.user).set({ role: "admin" }).where(eq(schema.user.id, ur.id));
                }
              }
            }
          }
        },
        signIn: {
          after: async (data: any) => {
            if (env.ADMIN_EMAIL && data.user) {
              const adminEmails = env.ADMIN_EMAIL.split(",").map((e) => e.trim().toLowerCase());
              const userEmail = data.user.email.toLowerCase().trim();
              console.log(`[Auth:AutoAdmin] signIn.after: Checking ${userEmail}`);

              if (adminEmails.includes(userEmail) && (data.user as any).role !== "admin") {
                console.log(`[Auth:AutoAdmin] signIn.after: Promoting ${userEmail} to admin`);
                await db.update(schema.user)
                  .set({ role: "admin" })
                  .where(eq(schema.user.id, data.user.id));
              } else if (adminEmails.includes(userEmail)) {
                console.log(`[Auth:AutoAdmin] signIn.after: User ${userEmail} already admin`);
              }
            }
          }
        },
        user: {
          create: {
            before: async (user) => {
              if (env.ADMIN_EMAIL) {
                const adminEmails = env.ADMIN_EMAIL.split(",").map((e) => e.trim().toLowerCase());
                const userEmail = user.email.toLowerCase().trim();
                console.log(`[Auth:AutoAdmin] user.create: Checking ${userEmail} against ${adminEmails.join(", ")}`);

                if (adminEmails.includes(userEmail)) {
                  console.log(`[Auth:AutoAdmin] user.create: Auto-promoting ${userEmail} to admin`);
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
