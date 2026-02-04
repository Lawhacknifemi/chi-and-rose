# Architecture: Authentication vs Subscriptions

## Core Principle: Separation of Concerns

### Authentication = "Who are you?"
- Handled by **Better-Auth**
- Manages user identity, sessions, OAuth providers
- **Location:** `packages/auth/`

### Subscriptions = "What can you access?"
- Handled by **Subscription/Entitlement Service**
- Manages access control, purchase verification, entitlements
- **Location:** `packages/api/src/routers/subscriptions.ts`

## Why Separate?

### 1. **Different Concerns**
- **Auth:** User identity, login, sessions
- **Subscriptions:** Access control, purchases, entitlements

### 2. **User Can Have Multiple Auth Methods**
```
User can authenticate via:
- Email/password (Better-Auth)
- Google OAuth (Better-Auth)
- Apple Sign-In (Better-Auth)
- Social login (Better-Auth)

But subscription can come from:
- Google Play purchase
- Apple App Store purchase
- Polar web subscription
- Direct payment
```

### 3. **Subscription Independent of Auth Method**
```
User signs in with email → Has Google Play subscription ✅
User signs in with Google → Has Apple subscription ✅
User signs in with Apple → Has Polar subscription ✅
```

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER AUTHENTICATION                       │
│                    (Better-Auth)                             │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Email/Pass   │  │ Google OAuth │  │ Apple SignIn │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                            ▼                                 │
│                   ┌─────────────────┐                        │
│                   │  User Account   │                        │
│                   │  (user table)   │                        │
│                   └────────┬────────┘                        │
└────────────────────────────┼─────────────────────────────────┘
                             │
                             │ userId
                             │
┌────────────────────────────┼─────────────────────────────────┐
│              SUBSCRIPTION/ENTITLEMENT SERVICE                │
│                                                               │
│                   ┌──────────────────┐                       │
│                   │ Verify Purchase  │                       │
│                   │ (Google/Apple)   │                       │
│                   └────────┬─────────┘                       │
│                            │                                 │
│                            ▼                                 │
│              ┌───────────────────────────┐                   │
│              │ Subscription Record       │                   │
│              │ (mobile_subscription)     │                   │
│              │ - userId (linked)         │                   │
│              │ - productId               │                   │
│              │ - isActive                │                   │
│              │ - expiresAt               │                   │
│              └───────────────────────────┘                   │
│                            │                                 │
│                            ▼                                 │
│              ┌───────────────────────────┐                   │
│              │ Check Entitlement         │                   │
│              │ hasAccess(productId)      │                   │
│              └───────────────────────────┘                   │
└───────────────────────────────────────────────────────────────┘
```

## API Endpoints

### Authentication (Better-Auth)
```
POST /api/auth/sign-up          # Create account
POST /api/auth/sign-in          # Login
POST /api/auth/sign-out         # Logout
GET  /api/auth/session          # Get session
POST /api/auth/social/google    # Google OAuth
POST /api/auth/social/apple     # Apple Sign-In
```

### Subscriptions (Entitlement Service)
```
POST /rpc/subscriptions.verifyGooglePlay    # Verify Google Play purchase
POST /rpc/subscriptions.verifyApple         # Verify Apple purchase
GET  /rpc/subscriptions.getSubscriptions    # Get user's subscriptions
GET  /rpc/subscriptions.hasAccess           # Check if user has access
POST /rpc/subscriptions.syncSubscription    # Sync subscription status
```

## Key Difference

### ❌ WRONG: Mixing Auth with Subscriptions
```typescript
// This is mixing concerns
auth.verifyPurchase(purchaseToken); // ❌ Auth shouldn't verify purchases
```

### ✅ CORRECT: Separate Services
```typescript
// 1. Authenticate (Better-Auth)
const session = await auth.signIn({ email, password });

// 2. Verify purchase (Subscription Service)
const subscription = await api.subscriptions.verifyGooglePlay({
  purchaseToken,
  productId,
  packageName,
});

// 3. Check access (Subscription Service)
const hasAccess = await api.subscriptions.hasAccess({ productId: "pro" });
```

## Benefits

1. **Clear Separation:** Auth handles identity, subscriptions handle access
2. **Flexibility:** User can authenticate any way, have subscriptions from anywhere
3. **Maintainability:** Changes to auth don't affect subscriptions and vice versa
4. **Testability:** Can test auth and subscriptions independently
5. **Scalability:** Can scale auth and subscription services separately

## Implementation

### Better-Auth Configuration
```typescript
// packages/auth/src/index.ts
export const auth = betterAuth({
  // Email/password auth
  emailAndPassword: { enabled: true },
  
  // OAuth providers (for authentication)
  socialProviders: {
    google: { ... },  // Google OAuth (not Google Play)
    apple: { ... },   // Apple Sign-In (not App Store purchases)
  },
  
  // Polar plugin (web subscriptions)
  plugins: [polar({ ... })],
});
```

### Subscription Service
```typescript
// packages/api/src/routers/subscriptions.ts
// Handles purchase verification, NOT authentication
export const verifyGooglePlayPurchase = protectedProcedure
  .input(verifyGooglePlaySchema)
  .handler(async ({ input, context }) => {
    // User must be authenticated first (context.session)
    // Then verify their purchase and grant subscription
  });
```

## Summary

- **Authentication** (Better-Auth): Handles "Who are you?"
  - Email/password, Google OAuth, Apple Sign-In
  - Creates user accounts, manages sessions

- **Subscriptions** (Separate Service): Handles "What can you access?"
  - Google Play purchase verification
  - Apple App Store receipt validation
  - Entitlement checking

They work together but are **separate concerns**!
