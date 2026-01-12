/**
 * Idempotency Middleware for oRPC
 * 
 * Ensures that duplicate requests with the same idempotency key
 * return the same result without side effects.
 * 
 * Usage:
 * ```ts
 * const idempotentProcedure = publicProcedure.use(idempotencyMiddleware);
 * ```
 */

import { ORPCError, type Middleware } from "@orpc/server";
import { db } from "@chi-and-rose/db";
import { eq, and, gt } from "drizzle-orm";
import { idempotencyKeys } from "@chi-and-rose/db/schema/idempotency";

interface IdempotencyContext {
  idempotencyKey?: string;
}

/**
 * Idempotency middleware that:
 * 1. Extracts idempotency key from request headers
 * 2. Checks if request was already processed
 * 3. Returns cached response if found
 * 4. Processes request and caches result if new
 */
export const idempotencyMiddleware: Middleware<
  { context: { session?: { user: { id: string } } } },
  { context: IdempotencyContext }
> = async ({ context, next, meta }) => {
  // Extract idempotency key from headers (set by client)
  const idempotencyKey = meta?.headers?.["idempotency-key"] as string | undefined;

  // If no key provided, proceed normally (not idempotent)
  if (!idempotencyKey) {
    return next({ context: { ...context, idempotencyKey: undefined } });
  }

  // Validate key format (UUID v4 recommended)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
    throw new ORPCError("BAD_REQUEST", "Invalid idempotency key format");
  }

  const userId = context.session?.user?.id;

  // Check if this request was already processed
  const existing = await db
    .select()
    .from(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.key, idempotencyKey),
        userId ? eq(idempotencyKeys.userId, userId) : undefined,
        gt(idempotencyKeys.expiresAt, new Date())
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Request already processed - return cached response
    const cached = existing[0];
    return {
      data: JSON.parse(cached.responseBody),
      status: cached.statusCode,
      headers: cached.responseHeaders ? JSON.parse(cached.responseHeaders) : undefined,
    };
  }

  // Process the request
  const result = await next({ context: { ...context, idempotencyKey } });

  // Cache the result (with TTL - typically 24 hours)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  await db.insert(idempotencyKeys).values({
    key: idempotencyKey,
    userId: userId || null,
    method: meta?.method || "POST",
    path: meta?.path || "",
    requestHash: "", // Optional: hash of request body for additional validation
    statusCode: result.status || 200,
    responseBody: JSON.stringify(result.data),
    responseHeaders: result.headers ? JSON.stringify(result.headers) : null,
    expiresAt,
    createdAt: new Date(),
  }).onConflictDoNothing(); // Handle race condition if key was inserted between check and insert

  return result;
};
