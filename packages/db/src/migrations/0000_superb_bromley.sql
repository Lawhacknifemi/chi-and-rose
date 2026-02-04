CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"conditions" text[] DEFAULT '{}' NOT NULL,
	"symptoms" text[] DEFAULT '{}' NOT NULL,
	"goals" text[] DEFAULT '{}' NOT NULL,
	"dietary_preferences" text[] DEFAULT '{}' NOT NULL,
	"sensitivities" text[] DEFAULT '{}' NOT NULL,
	"date_of_birth" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_profile_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"key" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"method" text NOT NULL,
	"path" text NOT NULL,
	"request_hash" text,
	"status_code" integer NOT NULL,
	"response_body" text NOT NULL,
	"response_headers" text,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mobile_subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"platform" text NOT NULL,
	"product_id" text NOT NULL,
	"purchase_token" text,
	"transaction_id" text,
	"original_transaction_id" text,
	"receipt_data" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp,
	"auto_renewing" boolean DEFAULT false NOT NULL,
	"purchase_date" timestamp NOT NULL,
	"expiry_date" timestamp,
	"cancellation_date" timestamp,
	"verified_at" timestamp DEFAULT now() NOT NULL,
	"last_verified_at" timestamp,
	"verification_status" text DEFAULT 'verified' NOT NULL,
	"order_id" text,
	"package_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products_cache" (
	"barcode" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"name" text,
	"brand" text,
	"category" text,
	"ingredients_raw" text,
	"ingredients_parsed" jsonb,
	"nutrition" jsonb,
	"last_fetched" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"barcode" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingredient_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ingredient_name" text NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"avoid_for" text[] DEFAULT '{}' NOT NULL,
	"caution_for" text[] DEFAULT '{}' NOT NULL,
	"explanation" text,
	"confidence" real DEFAULT 1 NOT NULL,
	CONSTRAINT "ingredient_rule_ingredient_name_unique" UNIQUE("ingredient_name")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_subscription" ADD CONSTRAINT "mobile_subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "idempotency_keys_user_id_key_idx" ON "idempotency_keys" USING btree ("user_id","key");--> statement-breakpoint
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "mobile_subscription_userId_idx" ON "mobile_subscription" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mobile_subscription_platform_product_idx" ON "mobile_subscription" USING btree ("platform","product_id");--> statement-breakpoint
CREATE INDEX "mobile_subscription_transaction_idx" ON "mobile_subscription" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "mobile_subscription_purchase_token_idx" ON "mobile_subscription" USING btree ("purchase_token");--> statement-breakpoint
CREATE INDEX "mobile_subscription_isActive_idx" ON "mobile_subscription" USING btree ("is_active");