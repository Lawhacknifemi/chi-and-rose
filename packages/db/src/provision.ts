import { db } from "./index";
import { sql } from "drizzle-orm";

export async function provisionDatabase() {
  try {
    console.log("🛠️  Targeting DB for provisioning...");

    // ... (rest of the code is structurally similar, just wrapped)
    // I will replace the whole file content to ensure clean structure

    console.log("Creating tables if they don't exist...");

    // Create user table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "user" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL UNIQUE,
        "email_verified" BOOLEAN DEFAULT false NOT NULL,
        "image" TEXT,
        "role" TEXT DEFAULT 'user' NOT NULL,
        "is_suspended" BOOLEAN DEFAULT false NOT NULL,
        "plan" TEXT DEFAULT 'free' NOT NULL,
        "can_comment" BOOLEAN DEFAULT true NOT NULL,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log("✓ user table ready");

    // Backfill columns
    await db.execute(sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user' AND column_name='role') THEN 
          ALTER TABLE "user" ADD COLUMN "role" TEXT DEFAULT 'user' NOT NULL; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user' AND column_name='is_suspended') THEN 
          ALTER TABLE "user" ADD COLUMN "is_suspended" BOOLEAN DEFAULT false NOT NULL; 
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user' AND column_name='plan') THEN 
          ALTER TABLE "user" ADD COLUMN "plan" TEXT DEFAULT 'free' NOT NULL; 
        END IF; 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user' AND column_name='can_comment') THEN 
          ALTER TABLE "user" ADD COLUMN "can_comment" BOOLEAN DEFAULT true NOT NULL; 
        END IF; 
      END $$;
    `);

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
    console.log("✓ session table ready");

    // Create index on session.user_id
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session"("user_id")
    `);

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
    console.log("✓ account table ready");

    // Create index on account.user_id
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account"("user_id")
    `);

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
    console.log("✓ verification table ready");

    // Create index on verification.identifier
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification"("identifier")
    `);

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
    console.log("✓ mobile_subscription table ready");

    // Create indexes for mobile_subscription
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "mobile_subscription_userId_idx" ON "mobile_subscription"("user_id");
      CREATE INDEX IF NOT EXISTS "mobile_subscription_platform_product_idx" ON "mobile_subscription"("platform", "product_id");
      CREATE INDEX IF NOT EXISTS "mobile_subscription_transaction_idx" ON "mobile_subscription"("transaction_id");
      CREATE INDEX IF NOT EXISTS "mobile_subscription_purchase_token_idx" ON "mobile_subscription"("purchase_token");
      CREATE INDEX IF NOT EXISTS "mobile_subscription_isActive_idx" ON "mobile_subscription"("is_active");
    `);

    // Create user_profile table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "user_profile" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" TEXT NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE CASCADE,
        "conditions" TEXT[] NOT NULL DEFAULT '{}',
        "symptoms" TEXT[] NOT NULL DEFAULT '{}',
        "goals" TEXT[] NOT NULL DEFAULT '{}',
        "dietary_preferences" TEXT[] NOT NULL DEFAULT '{}',
        "sensitivities" TEXT[] NOT NULL DEFAULT '{}',
        "date_of_birth" TIMESTAMP,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log("✓ user_profile table ready");

    // Create products_cache table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "products_cache" (
        "barcode" TEXT PRIMARY KEY,
        "source" TEXT NOT NULL,
        "name" TEXT,
        "brand" TEXT,
        "category" TEXT,
        "ingredients_raw" TEXT,
        "ingredients_parsed" JSONB,
        "nutrition" JSONB,
        "last_fetched" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log("✓ products_cache table ready");

    // Create scan table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "scan" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" TEXT NOT NULL,
        "barcode" TEXT NOT NULL,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log("✓ scan table ready");

    // Create ingredient_rule table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "ingredient_rule" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "ingredient_name" TEXT NOT NULL UNIQUE,
        "tags" TEXT[] NOT NULL DEFAULT '{}',
        "avoid_for" TEXT[] NOT NULL DEFAULT '{}',
        "caution_for" TEXT[] NOT NULL DEFAULT '{}',
        "explanation" TEXT,
        "confidence" REAL DEFAULT 1.0 NOT NULL
      )
    `);
    console.log("✓ ingredient_rule table ready");

    // Create indexes for new tables
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "user_profile_userId_idx" ON "user_profile"("user_id");
      CREATE INDEX IF NOT EXISTS "scan_userId_idx" ON "scan"("user_id");
      CREATE INDEX IF NOT EXISTS "scan_barcode_idx" ON "scan"("barcode");
      CREATE INDEX IF NOT EXISTS "ingredient_rule_name_idx" ON "ingredient_rule"("ingredient_name");
    `);

    // Create articles table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "articles" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "summary" TEXT,
        "image_url" TEXT,
        "category" TEXT NOT NULL,
        "is_published" BOOLEAN DEFAULT false NOT NULL,
        "published_at" TIMESTAMP,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log("✓ articles table ready");

    // Create daily_tips table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "daily_tips" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "phase" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "actionable_tip" TEXT,
        "category" TEXT,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log("✓ daily_tips table ready");

    console.log("\n✅ Database provisioning complete.");
  } catch (error) {
    console.error("❌ Error provisioning database:", error);
    // Do NOT exit process, just log error. Server might still fail later but this is safer.
  }
}
