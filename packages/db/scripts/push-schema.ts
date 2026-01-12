import { db } from "../src/index";
import * as schema from "../src/schema";
import { sql } from "drizzle-orm";

async function pushSchema() {
  try {
    console.log("Creating tables...");

    // Create user table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "user" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL UNIQUE,
        "email_verified" BOOLEAN DEFAULT false NOT NULL,
        "image" TEXT,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log("✓ Created user table");

    // Create session table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "session" (
        "id" TEXT PRIMARY KEY,
        "expires_at" TIMESTAMP NOT NULL,
        "token" TEXT NOT NULL UNIQUE,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "ip_address" TEXT,
        "user_agent" TEXT,
        "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);
    console.log("✓ Created session table");

    // Create index on session.user_id
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session"("user_id")
    `);
    console.log("✓ Created session index");

    // Create account table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "account" (
        "id" TEXT PRIMARY KEY,
        "account_id" TEXT NOT NULL,
        "provider_id" TEXT NOT NULL,
        "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "access_token" TEXT,
        "refresh_token" TEXT,
        "id_token" TEXT,
        "access_token_expires_at" TIMESTAMP,
        "refresh_token_expires_at" TIMESTAMP,
        "scope" TEXT,
        "password" TEXT,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log("✓ Created account table");

    // Create index on account.user_id
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account"("user_id")
    `);
    console.log("✓ Created account index");

    // Create verification table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "verification" (
        "id" TEXT PRIMARY KEY,
        "identifier" TEXT NOT NULL,
        "value" TEXT NOT NULL,
        "expires_at" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log("✓ Created verification table");

    // Create index on verification.identifier
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification"("identifier")
    `);
    console.log("✓ Created verification index");

    // Create mobile_subscription table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "mobile_subscription" (
        "id" TEXT PRIMARY KEY,
        "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "platform" TEXT NOT NULL,
        "product_id" TEXT NOT NULL,
        "purchase_token" TEXT,
        "transaction_id" TEXT,
        "original_transaction_id" TEXT,
        "receipt_data" TEXT,
        "is_active" BOOLEAN DEFAULT true NOT NULL,
        "expires_at" TIMESTAMP,
        "auto_renewing" BOOLEAN DEFAULT false NOT NULL,
        "purchase_date" TIMESTAMP NOT NULL,
        "expiry_date" TIMESTAMP,
        "cancellation_date" TIMESTAMP,
        "verified_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "last_verified_at" TIMESTAMP,
        "verification_status" TEXT DEFAULT 'verified' NOT NULL,
        "order_id" TEXT,
        "package_name" TEXT,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log("✓ Created mobile_subscription table");

    // Create indexes for mobile_subscription
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "mobile_subscription_userId_idx" ON "mobile_subscription"("user_id");
      CREATE INDEX IF NOT EXISTS "mobile_subscription_platform_product_idx" ON "mobile_subscription"("platform", "product_id");
      CREATE INDEX IF NOT EXISTS "mobile_subscription_transaction_idx" ON "mobile_subscription"("transaction_id");
      CREATE INDEX IF NOT EXISTS "mobile_subscription_purchase_token_idx" ON "mobile_subscription"("purchase_token");
      CREATE INDEX IF NOT EXISTS "mobile_subscription_isActive_idx" ON "mobile_subscription"("is_active");
    `);
    console.log("✓ Created mobile_subscription indexes");

    console.log("\n✅ All tables created successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating tables:", error);
    process.exit(1);
  }
}

pushSchema();
