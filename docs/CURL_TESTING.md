# API Testing with cURL

Guide for testing all API endpoints using cURL commands.

## Base URLs

- **Server:** `http://localhost:3000`
- **Auth Endpoints:** `http://localhost:3000/api/auth`
- **RPC Endpoints:** `http://localhost:3000/rpc`
- **API Docs:** `http://localhost:3000/api-reference`

## Step 1: Authentication

All subscription endpoints require authentication. First, authenticate to get a session cookie.

### Sign Up (Create Account)

```bash
curl -X POST http://localhost:3000/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }' \
  -c cookies.txt \
  -v
```

**Response:**
```json
{
  "user": {
    "id": "...",
    "email": "test@example.com",
    "name": "Test User"
  }
}
```

### Sign In (Existing Account)

```bash
curl -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' \
  -c cookies.txt \
  -v
```

**Response:**
```json
{
  "user": {
    "id": "...",
    "email": "test@example.com",
    "name": "Test User"
  },
  "session": {
    "id": "...",
    "expiresAt": "..."
  }
}
```

### Get Current Session

```bash
curl -X GET http://localhost:3000/api/auth/session \
  -b cookies.txt \
  -v
```

**Response:**
```json
{
  "user": {
    "id": "...",
    "email": "test@example.com"
  },
  "session": {
    "id": "...",
    "expiresAt": "..."
  }
}
```

### Sign Out

```bash
curl -X POST http://localhost:3000/api/auth/sign-out \
  -b cookies.txt \
  -v
```

---

## Step 2: Health Check (No Auth Required)

Test that the server is running:

```bash
curl -X POST http://localhost:3000/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "procedure": "healthCheck",
    "input": null
  }' \
  -v
```

**Expected Response:**
```json
{
  "data": "OK"
}
```

Or simpler (if using oRPC REST format):

```bash
curl http://localhost:3000/rpc/healthCheck \
  -v
```

---

## Step 3: Subscription Endpoints (Requires Auth)

All subscription endpoints require authentication. Use the cookies from Step 1.

### 3.1. Verify Google Play Purchase

```bash
curl -X POST http://localhost:3000/rpc/subscriptions.verifyGooglePlay \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "purchaseToken": "your-purchase-token-here",
    "productId": "pro_monthly",
    "packageName": "com.yourapp.package",
    "isSubscription": true
  }' \
  -v
```

**Example with Test Data:**
```bash
curl -X POST http://localhost:3000/rpc/subscriptions.verifyGooglePlay \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "purchaseToken": "opaque-token-up-to-450-characters",
    "productId": "pro_monthly",
    "packageName": "com.example.app",
    "isSubscription": true
  }' \
  -v
```

**Success Response:**
```json
{
  "success": true,
  "subscription": {
    "isActive": true,
    "expiresAt": "2024-12-31T23:59:59.000Z",
    "autoRenewing": true
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Purchase verification failed"
}
```

### 3.2. Verify Apple App Store Receipt

```bash
curl -X POST http://localhost:3000/rpc/subscriptions.verifyApple \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "receiptData": "base64-encoded-receipt-data-here",
    "productId": "pro_monthly"
  }' \
  -v
```

**Example:**
```bash
# First, encode receipt to base64 (if you have a receipt file)
RECEIPT_BASE64=$(base64 -i receipt.txt)

curl -X POST http://localhost:3000/rpc/subscriptions.verifyApple \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d "{
    \"receiptData\": \"$RECEIPT_BASE64\",
    \"productId\": \"pro_monthly\"
  }" \
  -v
```

**Success Response:**
```json
{
  "success": true,
  "subscription": {
    "isActive": true,
    "expiresAt": "2024-12-31T23:59:59.000Z",
    "transactionId": "1000000123456789"
  }
}
```

### 3.3. Get User's Subscriptions

```bash
curl -X GET http://localhost:3000/rpc/subscriptions.getSubscriptions \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -v
```

**Response:**
```json
{
  "subscriptions": [
    {
      "id": "subscription_id",
      "platform": "google_play",
      "productId": "pro_monthly",
      "isActive": true,
      "expiresAt": "2024-12-31T23:59:59.000Z",
      "autoRenewing": true,
      "purchaseDate": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 3.4. Check Access to Product

```bash
curl -X POST http://localhost:3000/rpc/subscriptions.hasAccess \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "productId": "pro_monthly"
  }' \
  -v
```

**Success Response:**
```json
{
  "hasAccess": true,
  "subscription": {
    "id": "subscription_id",
    "platform": "google_play",
    "expiresAt": "2024-12-31T23:59:59.000Z"
  }
}
```

**No Access Response:**
```json
{
  "hasAccess": false,
  "subscription": null
}
```

### 3.5. Sync Subscription Status

Re-verify a subscription with the store:

```bash
curl -X POST http://localhost:3000/rpc/subscriptions.syncSubscription \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "subscriptionId": "your-subscription-id-from-getSubscriptions"
  }' \
  -v
```

**Success Response:**
```json
{
  "success": true,
  "subscription": {
    "isActive": true,
    "expiresAt": "2024-12-31T23:59:59.000Z"
  }
}
```

---

## Complete Test Script

Here's a complete bash script to test all endpoints:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"
COOKIE_FILE="cookies.txt"

echo "=== Step 1: Sign Up ==="
curl -X POST "$BASE_URL/api/auth/sign-up" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }' \
  -c "$COOKIE_FILE" \
  -w "\nHTTP Status: %{http_code}\n\n"

echo "=== Step 2: Health Check ==="
curl -X GET "$BASE_URL/rpc/healthCheck" \
  -w "\nHTTP Status: %{http_code}\n\n"

echo "=== Step 3: Get Session ==="
curl -X GET "$BASE_URL/api/auth/session" \
  -b "$COOKIE_FILE" \
  -w "\nHTTP Status: %{http_code}\n\n"

echo "=== Step 4: Get Subscriptions (empty) ==="
curl -X GET "$BASE_URL/rpc/subscriptions.getSubscriptions" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -w "\nHTTP Status: %{http_code}\n\n"

echo "=== Step 5: Check Access (no access) ==="
curl -X POST "$BASE_URL/rpc/subscriptions.hasAccess" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d '{
    "productId": "pro_monthly"
  }' \
  -w "\nHTTP Status: %{http_code}\n\n"

echo "=== Step 6: Verify Google Play (with test data) ==="
curl -X POST "$BASE_URL/rpc/subscriptions.verifyGooglePlay" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d '{
    "purchaseToken": "test-token",
    "productId": "pro_monthly",
    "packageName": "com.example.app",
    "isSubscription": true
  }' \
  -w "\nHTTP Status: %{http_code}\n\n"

echo "=== Cleanup: Sign Out ==="
curl -X POST "$BASE_URL/api/auth/sign-out" \
  -b "$COOKIE_FILE" \
  -w "\nHTTP Status: %{http_code}\n\n"

# Clean up cookie file
rm -f "$COOKIE_FILE"
```

Save as `test-api.sh`, make it executable, and run:
```bash
chmod +x test-api.sh
./test-api.sh
```

---

## Testing with oRPC RPC Format

oRPC uses a specific RPC format. If the direct path doesn't work, try:

### RPC Format Request

```bash
curl -X POST http://localhost:3000/rpc \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "procedure": "subscriptions.verifyGooglePlay",
    "input": {
      "purchaseToken": "test-token",
      "productId": "pro_monthly",
      "packageName": "com.example.app",
      "isSubscription": true
    }
  }' \
  -v
```

---

## Troubleshooting

### 401 Unauthorized
- Make sure you've signed in and cookies are saved
- Check that cookies.txt exists and contains session cookies
- Try signing in again

### 404 Not Found
- Check that the server is running on port 3000
- Verify the endpoint path is correct
- Check oRPC routing format

### 500 Internal Server Error
- Check server logs for errors
- Verify environment variables are set (Google Play/Apple credentials)
- Ensure database is connected and schema is migrated

### Cookie Issues
```bash
# View saved cookies
cat cookies.txt

# Test with verbose output
curl -v -b cookies.txt http://localhost:3000/api/auth/session

# Clear cookies and re-authenticate
rm cookies.txt
```

---

## Using HTTPie (Alternative to cURL)

If you prefer HTTPie, here are equivalent commands:

```bash
# Sign up
http POST localhost:3000/api/auth/sign-up \
  email=test@example.com \
  password=password123 \
  name="Test User" \
  --session=cookies

# Get subscriptions
http GET localhost:3000/rpc/subscriptions.getSubscriptions \
  --session=cookies

# Verify Google Play
http POST localhost:3000/rpc/subscriptions.verifyGooglePlay \
  purchaseToken=test-token \
  productId=pro_monthly \
  packageName=com.example.app \
  isSubscription:=true \
  --session=cookies
```

---

## Testing with Real Purchase Tokens

### Google Play (Sandbox)

1. Create test account in Google Play Console
2. Make test purchase in app
3. Get purchase token from app logs
4. Use that token in curl request

### Apple App Store (Sandbox)

1. Create sandbox tester account
2. Sign out of production App Store
3. Make test purchase in app
4. Get receipt data (base64 encoded)
5. Use that receipt in curl request

---

## Environment Setup

Make sure these environment variables are set in `apps/server/.env`:

```bash
# Database
DATABASE_URL=postgresql://...

# Auth
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3001

# Google Play (optional - needed for verification)
GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PLAY_PRIVATE_KEY=...
GOOGLE_PLAY_PACKAGE_NAME=com.example.app

# Apple App Store (optional - needed for verification)
APPLE_APP_SHARED_SECRET=...
APPLE_BUNDLE_ID=com.example.app
```

---

## Quick Test Checklist

- [ ] Server is running (`curl http://localhost:3000`)
- [ ] Health check works (`curl http://localhost:3000/rpc/healthCheck`)
- [ ] Can sign up (`curl -X POST .../api/auth/sign-up`)
- [ ] Can sign in (`curl -X POST .../api/auth/sign-in/email`)
- [ ] Can get session (`curl .../api/auth/session`)
- [ ] Can get subscriptions (`curl .../rpc/subscriptions.getSubscriptions`)
- [ ] Can check access (`curl .../rpc/subscriptions.hasAccess`)
- [ ] Can verify purchase (requires valid tokens)
