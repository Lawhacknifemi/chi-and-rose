import { db } from "./index";
import { sql } from "drizzle-orm";

export async function provisionDatabase() {
  try {
    console.log("🛠️  Targeting DB for self-contained provisioning...");

    // 1. Create Core Auth Tables
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

    // Backfill user columns
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

    // 2. Create Feature Tables
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

    // 3. Create Community Tables
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "community_groups" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" TEXT NOT NULL,
        "description" TEXT,
        "icon_url" TEXT,
        "creator_id" TEXT NOT NULL REFERENCES "user"("id"),
        "member_count" INTEGER DEFAULT 0 NOT NULL,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "community_group_members" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "group_id" UUID NOT NULL REFERENCES "community_groups"("id"),
        "user_id" TEXT NOT NULL REFERENCES "user"("id"),
        "joined_at" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

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

    // 4. Create Cycle Tracker Tables
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "user_cycle_settings" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" TEXT NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE CASCADE,
        "average_cycle_length" INTEGER DEFAULT 28 NOT NULL,
        "average_period_length" INTEGER DEFAULT 5 NOT NULL,
        "last_period_start" DATE,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "cycles" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "start_date" DATE NOT NULL,
        "end_date" DATE,
        "is_prediction" BOOLEAN DEFAULT false NOT NULL,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "cycle_logs" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "date" DATE NOT NULL,
        "flow_intensity" TEXT,
        "symptoms" JSONB DEFAULT '[]'::jsonb,
        "mood" TEXT,
        "notes" TEXT,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    // 5. Create Mobile & Scanner Tables
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "mobile_subscription" (
        "id" TEXT PRIMARY KEY,
        "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "platform" TEXT NOT NULL,
        "product_id" TEXT NOT NULL,
        "purchase_token" TEXT,
        "transaction_id" TEXT,
        "is_active" BOOLEAN DEFAULT true NOT NULL,
        "expires_at" TIMESTAMP,
        "purchase_date" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

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

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "scan" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" TEXT NOT NULL,
        "barcode" TEXT NOT NULL,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

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

    console.log("✅ Database schema sync complete.");
  } catch (error) {
    console.error("❌ Error during database provisioning:", error);
  }
}
