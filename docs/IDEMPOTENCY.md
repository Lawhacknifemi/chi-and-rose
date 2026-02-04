# Idempotency System Design

## Overview

**Idempotency** ensures that repeating the same request produces the same result without side effects. This is critical for:
- Payment processing (prevent duplicate charges)
- Subscription upgrades (prevent multiple upgrades)
- State-changing operations (create, update, delete)

## Architecture

### Components

1. **Idempotency Key Generation** (Client-side)
   - Generates unique UUID v4 keys per operation
   - Persists keys in localStorage to survive page refreshes
   - Location: `apps/web/src/lib/idempotency.ts`

2. **Idempotency Middleware** (Server-side)
   - Validates and processes idempotency keys
   - Caches responses for duplicate requests
   - Location: `packages/api/src/middleware/idempotency.ts`

3. **Idempotency Storage** (Database)
   - Stores keys with cached responses
   - TTL: 24 hours (configurable)
   - Location: `packages/db/src/schema/idempotency.ts`

### Flow Diagram

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       │ 1. Generate idempotency key
       │    (UUID v4)
       │
       ▼
┌─────────────────┐
│  Request with    │
│  Idempotency-Key │
│  Header          │
└────────┬─────────┘
         │
         │ 2. Send request
         │
         ▼
┌─────────────────┐
│  Server         │
│  Middleware     │
└────────┬─────────┘
         │
         │ 3. Check if key exists
         │
         ▼
    ┌────────┐
    │ Exists?│
    └───┬────┘
        │
    ┌───┴───┐
    │       │
   Yes     No
    │       │
    │       ▼
    │  ┌──────────────┐
    │  │ Process      │
    │  │ Request      │
    │  └──────┬───────┘
    │         │
    │         ▼
    │  ┌──────────────┐
    │  │ Cache Result │
    │  │ (24h TTL)    │
    │  └──────────────┘
    │
    ▼
┌──────────────┐
│ Return       │
│ Cached       │
│ Response     │
└──────────────┘
```

## Implementation Patterns

### Pattern 1: Idempotency Keys (Recommended for Payments)

**When to use:** Critical operations like payments, subscriptions, purchases

```typescript
// Client-side
import { getIdempotencyKey } from "@/lib/idempotency";

const handleUpgrade = async () => {
  const idempotencyKey = getIdempotencyKey("upgrade-to-pro");
  
  const result = await fetch("/api/upgrade", {
    method: "POST",
    headers: {
      "Idempotency-Key": idempotencyKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ plan: "pro" }),
  });
  
  // Clear key after successful operation
  if (result.ok) {
    clearIdempotencyKey("upgrade-to-pro");
  }
};
```

### Pattern 2: Request Deduplication (Short-term)

**When to use:** UI interactions, rapid clicks, network retries

```typescript
// Client-side: Debounce rapid clicks
import { useRef } from "react";

const handleUpgrade = useRef<Promise<void> | null>(null);

const onClick = async () => {
  // If request already in progress, ignore
  if (handleUpgrade.current) {
    return;
  }
  
  handleUpgrade.current = upgradeToPro();
  await handleUpgrade.current;
  handleUpgrade.current = null;
};
```

### Pattern 3: Database Constraints

**When to use:** Preventing duplicate records

```sql
-- Unique constraint prevents duplicates
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL,
  UNIQUE(user_id, product_id) -- Prevents duplicate subscriptions
);
```

### Pattern 4: Optimistic Locking

**When to use:** Concurrent updates to same resource

```typescript
// Update with version check
UPDATE users 
SET plan = 'pro', version = version + 1
WHERE id = $1 AND version = $2;
-- If version doesn't match, update fails (stale data)
```

## Best Practices

### 1. **Key Format**
- Use UUID v4 (128-bit random)
- Include operation context: `upgrade-{userId}-{timestamp}`
- Store in localStorage for retry scenarios

### 2. **TTL (Time To Live)**
- Payment operations: 24-48 hours
- General operations: 1-24 hours
- Read operations: Not needed (naturally idempotent)

### 3. **Error Handling**
- Network errors: Retry with same key
- 4xx errors: Don't cache (client error)
- 5xx errors: Cache for retry (server error)

### 4. **Race Conditions**
- Use database transactions
- `ON CONFLICT DO NOTHING` for key insertion
- Check-then-insert pattern with proper locking

### 5. **HTTP Methods**
- **GET**: Naturally idempotent (no side effects)
- **PUT**: Should be idempotent (replace resource)
- **DELETE**: Should be idempotent (safe to retry)
- **POST**: Requires idempotency keys (creates resources)

## Real-World Examples

### Example 1: Payment Processing

```typescript
// ✅ Good: Idempotent payment
const processPayment = async (amount: number) => {
  const key = getIdempotencyKey(`payment-${userId}-${Date.now()}`);
  
  return fetch("/api/payments", {
    method: "POST",
    headers: { "Idempotency-Key": key },
    body: JSON.stringify({ amount }),
  });
};

// ❌ Bad: Non-idempotent (duplicate charges possible)
const processPayment = async (amount: number) => {
  return fetch("/api/payments", {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
};
```

### Example 2: Subscription Upgrade

```typescript
// ✅ Good: Prevents duplicate upgrades
const upgradeSubscription = async () => {
  const key = getIdempotencyKey(`upgrade-${userId}`);
  
  try {
    const result = await authClient.checkout({ 
      slug: "pro",
      idempotencyKey: key, // If supported by Better-Auth
    });
    clearIdempotencyKey(`upgrade-${userId}`);
    return result;
  } catch (error) {
    // Don't clear key on error - allow retry
    throw error;
  }
};
```

## Testing

### Test Scenarios

1. **Duplicate Request**
   ```typescript
   const key = generateIdempotencyKey();
   const req1 = await fetch("/api/upgrade", { 
     headers: { "Idempotency-Key": key } 
   });
   const req2 = await fetch("/api/upgrade", { 
     headers: { "Idempotency-Key": key } 
   });
   // req2 should return cached result from req1
   ```

2. **Expired Key**
   ```typescript
   // Key older than 24 hours should be treated as new request
   ```

3. **Different Keys**
   ```typescript
   // Different keys should process independently
   ```

## Monitoring

Track these metrics:
- Idempotency key hit rate (cached responses)
- Key expiration rate
- Duplicate request attempts
- Race condition occurrences

## References

- [Stripe Idempotency Keys](https://stripe.com/docs/api/idempotent_requests)
- [RFC 7231: HTTP Methods](https://tools.ietf.org/html/rfc7231#section-4.2.2)
- [Idempotency in REST APIs](https://restfulapi.net/idempotent-rest-apis/)
