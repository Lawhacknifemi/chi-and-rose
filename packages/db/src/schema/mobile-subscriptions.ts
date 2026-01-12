/**
 * Mobile Subscriptions Schema
 * 
 * Stores verified in-app purchases from Google Play and Apple App Store
 */

import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const mobileSubscription = pgTable(
  "mobile_subscription",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    
    // Platform identification
    platform: text("platform").notNull(), // "google_play" | "apple_app_store"
    productId: text("product_id").notNull(), // In-app product ID (e.g., "pro_monthly")
    
    // Platform-specific identifiers
    purchaseToken: text("purchase_token"), // Google Play purchase token
    transactionId: text("transaction_id"), // Apple transaction ID
    originalTransactionId: text("original_transaction_id"), // Apple original transaction ID
    receiptData: text("receipt_data"), // Full receipt data (JSON string)
    
    // Subscription status
    isActive: boolean("is_active").default(true).notNull(),
    expiresAt: timestamp("expires_at"), // When subscription expires (null for lifetime purchases)
    autoRenewing: boolean("auto_renewing").default(false).notNull(), // Google Play auto-renewal status
    
    // Purchase details
    purchaseDate: timestamp("purchase_date").notNull(),
    expiryDate: timestamp("expiry_date"), // When subscription expires
    cancellationDate: timestamp("cancellation_date"), // When subscription was cancelled
    
    // Verification
    verifiedAt: timestamp("verified_at").defaultNow().notNull(),
    lastVerifiedAt: timestamp("last_verified_at"), // Last time we verified with store
    verificationStatus: text("verification_status").default("verified").notNull(), // "verified" | "expired" | "revoked"
    
    // Metadata
    orderId: text("order_id"), // Google Play order ID
    packageName: text("package_name"), // Android package name or iOS bundle ID
    
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("mobile_subscription_userId_idx").on(table.userId),
    index("mobile_subscription_platform_product_idx").on(table.platform, table.productId),
    index("mobile_subscription_transaction_idx").on(table.transactionId),
    index("mobile_subscription_purchase_token_idx").on(table.purchaseToken),
    index("mobile_subscription_isActive_idx").on(table.isActive),
  ]
);

export const mobileSubscriptionRelations = relations(mobileSubscription, ({ one }) => ({
  user: one(user, {
    fields: [mobileSubscription.userId],
    references: [user.id],
  }),
}));

