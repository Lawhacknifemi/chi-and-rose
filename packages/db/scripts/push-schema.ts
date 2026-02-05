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

    // Backfill role column if specific column is missing (simple idempotent check)
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
    console.log("✓ Created user_profile table");

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
    console.log("✓ Created products_cache table");

    // Create scan table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "scan" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" TEXT NOT NULL,
        "barcode" TEXT NOT NULL,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log("✓ Created scan table");

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
    console.log("✓ Created ingredient_rule table");

    // Create indexes for new tables
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "user_profile_userId_idx" ON "user_profile"("user_id");
      CREATE INDEX IF NOT EXISTS "scan_userId_idx" ON "scan"("user_id");
      CREATE INDEX IF NOT EXISTS "scan_barcode_idx" ON "scan"("barcode");
      CREATE INDEX IF NOT EXISTS "ingredient_rule_name_idx" ON "ingredient_rule"("ingredient_name");
    `);
    console.log("✓ Created new table indexes");

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
    console.log("✓ Created articles table");

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
    console.log("✓ Created daily_tips table");

    // Create community_groups table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "community_groups" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" TEXT NOT NULL,
        "description" TEXT,
        "icon_url" TEXT,
        "member_count" INTEGER DEFAULT 0 NOT NULL,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log("✓ Created community_groups table");

    // Create community_posts table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "community_posts" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "group_id" UUID REFERENCES "community_groups"("id"),
        "user_id" TEXT NOT NULL REFERENCES "user"("id"),
        "title" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "image_url" TEXT,
        "likes_count" INTEGER DEFAULT 0 NOT NULL,
        "comments_count" INTEGER DEFAULT 0 NOT NULL,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log("✓ Created community_posts table");

    // Create community_comments table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "community_comments" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "post_id" UUID NOT NULL REFERENCES "community_posts"("id"),
        "user_id" TEXT NOT NULL REFERENCES "user"("id"),
        "content" TEXT NOT NULL,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log("✓ Created community_comments table");

    // Create indexes for community tables
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "community_posts_group_id_idx" ON "community_posts"("group_id");
      CREATE INDEX IF NOT EXISTS "community_posts_user_id_idx" ON "community_posts"("user_id");
      CREATE INDEX IF NOT EXISTS "community_comments_post_id_idx" ON "community_comments"("post_id");
    `);
    console.log("✓ Created community table indexes");

    console.log("\n✅ All tables created successfully!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating tables:", error);
    process.exit(1);
  }
}

pushSchema();
