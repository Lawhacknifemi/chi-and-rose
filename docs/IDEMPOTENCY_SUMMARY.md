# Idempotency: System Design Summary

## What is it called?

**Idempotency** - The property of operations that can be applied multiple times without changing the result beyond the initial application.

## Key Concepts

### 1. **Idempotent Operations**
An operation is idempotent if:
- `f(f(x)) = f(x)` - Applying it twice = applying it once
- Safe to retry without side effects
- Example: `DELETE /users/123` - deleting twice has same effect as once

### 2. **Non-Idempotent Operations**
Operations that cause side effects on each call:
- `POST /payments` - creates new charge each time
- `POST /subscriptions` - creates duplicate subscriptions
- `POST /orders` - creates duplicate orders

## Common Strategies

### Strategy 1: Idempotency Keys ⭐ (Best for Payments)

**How it works:**
1. Client generates unique key (UUID) per operation
2. Server checks if key was processed
3. If yes → return cached response
4. If no → process and cache result

**Example:**
```typescript
// Client
const key = crypto.randomUUID();
fetch("/api/payment", {
  headers: { "Idempotency-Key": key },
  body: JSON.stringify({ amount: 100 })
});

// Server
if (cache.has(key)) {
  return cache.get(key); // Return cached result
}
const result = processPayment();
cache.set(key, result, { ttl: 24h });
return result;
```

### Strategy 2: Request Deduplication

**How it works:**
- Track recent requests in memory/cache
- Reject duplicates within time window (e.g., 5 seconds)
- Use request hash: `hash(method + path + body + user_id)`

**Example:**
```typescript
const requestHash = hash(`${method}:${path}:${body}:${userId}`);
if (seen.has(requestHash)) {
  return "Duplicate request";
}
seen.set(requestHash, true, { ttl: 5s });
processRequest();
```

### Strategy 3: Database Constraints

**How it works:**
- Use unique constraints to prevent duplicates
- Database rejects duplicate inserts/updates

**Example:**
```sql
CREATE TABLE subscriptions (
  user_id UUID,
  product_id UUID,
  UNIQUE(user_id, product_id) -- Prevents duplicates
);
```

### Strategy 4: Optimistic Locking

**How it works:**
- Use version numbers/timestamps
- Reject updates with stale versions

**Example:**
```sql
UPDATE users 
SET plan = 'pro', version = version + 1
WHERE id = $1 AND version = $2;
-- Fails if version changed (concurrent update)
```

## Implementation in Your Codebase

### Current State
- ✅ Better-Auth/Polar likely handles idempotency for checkout internally
- ✅ TanStack Query provides request deduplication for GET requests
- ⚠️ Custom operations may need explicit idempotency

### Recommended Approach

**For Payment/Subscription Operations:**
1. Use Polar's built-in idempotency (if available)
2. Add idempotency keys for custom payment endpoints
3. Implement middleware for critical operations

**For UI Interactions:**
1. Disable button during request (prevent double-clicks)
2. Use React Query's `isLoading` state
3. Debounce rapid clicks

**Example Implementation:**
```typescript
// In dashboard.tsx
const [isProcessing, setIsProcessing] = useState(false);

const handleUpgrade = async () => {
  if (isProcessing) return; // Prevent duplicate clicks
  
  setIsProcessing(true);
  try {
    await authClient.checkout({ slug: "pro" });
  } finally {
    setIsProcessing(false);
  }
};
```

## System Design Patterns

### Pattern 1: Client-Side Deduplication
- **Use case:** UI interactions, rapid clicks
- **Implementation:** Disable button, loading state
- **TTL:** Request duration

### Pattern 2: Server-Side Idempotency Keys
- **Use case:** Payments, subscriptions, critical operations
- **Implementation:** Middleware + database cache
- **TTL:** 24-48 hours

### Pattern 3: Database-Level Constraints
- **Use case:** Preventing duplicate records
- **Implementation:** UNIQUE constraints, transactions
- **TTL:** Permanent

### Pattern 4: Distributed Locking
- **Use case:** Multi-server environments
- **Implementation:** Redis locks, distributed locks
- **TTL:** Request duration

## Best Practices

1. **Always use idempotency for:**
   - Payment processing
   - Subscription changes
   - Order creation
   - Account upgrades

2. **HTTP Method Guidelines:**
   - GET: Naturally idempotent ✅
   - PUT: Should be idempotent ✅
   - DELETE: Should be idempotent ✅
   - POST: Requires idempotency keys ⚠️

3. **Key Generation:**
   - Use UUID v4 (cryptographically random)
   - Include context: `operation-userId-timestamp`
   - Store client-side for retries

4. **Error Handling:**
   - Network errors: Retry with same key
   - 4xx errors: Don't cache (client error)
   - 5xx errors: Cache for retry (server error)

## Real-World Example: Your Checkout Flow

```typescript
// Current (vulnerable to duplicates)
const handleUpgrade = async () => {
  await authClient.checkout({ slug: "pro" });
};

// Improved (idempotent)
const handleUpgrade = async () => {
  // 1. Generate idempotency key
  const key = getIdempotencyKey(`checkout-${userId}`);
  
  // 2. Disable button (UI-level deduplication)
  setIsProcessing(true);
  
  try {
    // 3. Send with idempotency key
    await authClient.checkout({ 
      slug: "pro",
      idempotencyKey: key // If supported
    });
  } finally {
    setIsProcessing(false);
  }
};
```

## Related Concepts

- **Race Conditions:** Multiple requests modifying same resource
- **Distributed Transactions:** Ensuring consistency across services
- **Eventual Consistency:** System eventually reaches consistent state
- **Idempotent Consumers:** Message queue consumers that can safely retry

## References

- [Stripe: Idempotent Requests](https://stripe.com/docs/api/idempotent_requests)
- [AWS: Making Requests Idempotent](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/Run_Instance_Idempotency.html)
- [RFC 7231: HTTP Methods](https://tools.ietf.org/html/rfc7231#section-4.2.2)
