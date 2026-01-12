/**
 * Idempotency Keys Schema
 * 
 * Stores idempotency keys to prevent duplicate request processing.
 * Keys expire after 24 hours (configurable).
 */

import { pgTable, text, timestamp, integer, index } from "drizzle-orm/pg-core";

export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    key: text("key").primaryKey(), // The idempotency key (UUID)
    userId: text("user_id"), // Optional: associate with user for faster lookups
    method: text("method").notNull(), // HTTP method
    path: text("path").notNull(), // Request path
    requestHash: text("request_hash"), // Optional: hash of request body
    statusCode: integer("status_code").notNull(), // HTTP status code of response
    responseBody: text("response_body").notNull(), // Cached response body
    responseHeaders: text("response_headers"), // Cached response headers (JSON)
    expiresAt: timestamp("expires_at").notNull(), // When this key expires
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // Index for fast lookups by user and key
    index("idempotency_keys_user_id_key_idx").on(table.userId, table.key),
    // Index for cleanup of expired keys
    index("idempotency_keys_expires_at_idx").on(table.expiresAt),
  ]
);
