# Mobile Purchase Verification API

API endpoints for mobile clients (iOS/Android) to verify in-app purchases and subscriptions from Google Play and Apple App Store.

## Base URL

```
https://your-api-domain.com/rpc
```

## Authentication

All endpoints require authentication. Include the session token in the request:

```http
Authorization: Bearer <session_token>
```

Or use cookies if using web-based authentication.

## Endpoints

### 1. Verify Google Play Purchase

Verify a Google Play in-app purchase or subscription.

**Endpoint:** `POST /rpc/mobile.verifyGooglePlay`

**Request Body:**
```json
{
  "purchaseToken": "string",      // Purchase token from Google Play
  "productId": "string",          // Product ID (e.g., "pro_monthly")
  "packageName": "string",        // Android package name
  "isSubscription": boolean       // true for subscriptions, false for one-time purchases
}
```

**Response:**
```json
{
  "success": true,
  "subscription": {
    "isActive": true,
    "expiresAt": "2024-12-31T23:59:59.000Z",  // null for one-time purchases
    "autoRenewing": true                      // Only for subscriptions
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

**Example (Android/Kotlin):**
```kotlin
// After successful purchase
val purchase = purchases.first()
val requestBody = mapOf(
    "purchaseToken" to purchase.purchaseToken,
    "productId" to purchase.products.first(),
    "packageName" to packageName,
    "isSubscription" to true
)

val response = httpClient.post("$baseUrl/rpc/mobile.verifyGooglePlay") {
    header("Authorization", "Bearer $sessionToken")
    contentType(ContentType.Application.Json)
    body = requestBody
}
```

**Example (React Native):**
```typescript
import { Platform } from 'react-native';
import * as RNIap from 'react-native-iap';

const verifyGooglePlayPurchase = async (purchase: RNIap.Purchase) => {
  const response = await fetch(`${API_URL}/rpc/mobile.verifyGooglePlay`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      purchaseToken: purchase.purchaseToken,
      productId: purchase.productId,
      packageName: 'com.yourapp.package',
      isSubscription: true,
    }),
  });
  
  return response.json();
};
```

---

### 2. Verify Apple App Store Receipt

Verify an Apple App Store receipt (includes all purchases).

**Endpoint:** `POST /rpc/mobile.verifyApple`

**Request Body:**
```json
{
  "receiptData": "string",  // Base64 encoded receipt data
  "productId": "string"     // Product ID to verify (e.g., "pro_monthly")
}
```

**Response:**
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

**Error Response:**
```json
{
  "success": false,
  "error": "Receipt verification failed"
}
```

**Example (iOS/Swift):**
```swift
// Get receipt data
guard let receiptURL = Bundle.main.appStoreReceiptURL,
      let receiptData = try? Data(contentsOf: receiptURL) else {
    return
}

let receiptBase64 = receiptData.base64EncodedString()

// Verify with API
let requestBody: [String: Any] = [
    "receiptData": receiptBase64,
    "productId": "pro_monthly"
]

var request = URLRequest(url: URL(string: "\(baseURL)/rpc/mobile.verifyApple")!)
request.httpMethod = "POST"
request.setValue("Bearer \(sessionToken)", forHTTPHeaderField: "Authorization")
request.setValue("application/json", forHTTPHeaderField: "Content-Type")
request.httpBody = try? JSONSerialization.data(withJSONObject: requestBody)

URLSession.shared.dataTask(with: request) { data, response, error in
    // Handle response
}.resume()
```

**Example (React Native):**
```typescript
import * as RNIap from 'react-native-iap';
import { Platform } from 'react-native';

const verifyAppleReceipt = async (receipt: string) => {
  const response = await fetch(`${API_URL}/rpc/mobile.verifyApple`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      receiptData: receipt,
      productId: 'pro_monthly',
    }),
  });
  
  return response.json();
};

// Usage
if (Platform.OS === 'ios') {
  const receipt = await RNIap.getReceiptIOS();
  const result = await verifyAppleReceipt(receipt);
}
```

---

### 3. Get Mobile Subscriptions

Get all active mobile subscriptions for the authenticated user.

**Endpoint:** `GET /rpc/mobile.getMobileSubscriptions`

**Response:**
```json
{
  "subscriptions": [
    {
      "id": "subscription_id",
      "platform": "google_play" | "apple_app_store",
      "productId": "pro_monthly",
      "isActive": true,
      "expiresAt": "2024-12-31T23:59:59.000Z",
      "autoRenewing": true,
      "purchaseDate": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Example:**
```typescript
const getSubscriptions = async () => {
  const response = await fetch(`${API_URL}/rpc/mobile.getMobileSubscriptions`, {
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
  });
  
  return response.json();
};
```

---

### 4. Sync Subscription Status

Re-verify a subscription with the store to get the latest status.

**Endpoint:** `POST /rpc/mobile.syncSubscription`

**Request Body:**
```json
{
  "subscriptionId": "string"  // Subscription ID from getMobileSubscriptions
}
```

**Response:**
```json
{
  "success": true,
  "subscription": {
    "isActive": true,
    "expiresAt": "2024-12-31T23:59:59.000Z"
  }
}
```

**Example:**
```typescript
const syncSubscription = async (subscriptionId: string) => {
  const response = await fetch(`${API_URL}/rpc/mobile.syncSubscription`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ subscriptionId }),
  });
  
  return response.json();
};
```

---

## Setup Instructions

### Google Play Setup

1. **Create Service Account:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a service account
   - Download JSON key file
   - Grant "Service Account User" role

2. **Link Service Account to Google Play:**
   - Go to [Google Play Console](https://play.google.com/console)
   - Settings → API access
   - Link your service account
   - Grant "View financial data" permission

3. **Environment Variables:**
   ```bash
   GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   GOOGLE_PLAY_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   GOOGLE_PLAY_PACKAGE_NAME=com.yourapp.package
   ```

### Apple App Store Setup

1. **Get App-Specific Shared Secret:**
   - Go to [App Store Connect](https://appstoreconnect.apple.com/)
   - My Apps → Your App → App Information
   - Copy "App-Specific Shared Secret"

2. **Environment Variables:**
   ```bash
   APPLE_APP_SHARED_SECRET=your-shared-secret-here
   APPLE_BUNDLE_ID=com.yourapp.bundle
   ```

---

## Best Practices

### 1. Verify Immediately After Purchase

Always verify purchases immediately after a successful purchase:

```typescript
// After purchase completes
const purchase = await RNIap.requestPurchase(productId);
if (purchase) {
  await verifyPurchase(purchase);
}
```

### 2. Handle Receipt Refresh (Apple)

Apple receipts can be refreshed. Always use the latest receipt:

```typescript
// iOS: Get fresh receipt
const receipt = await RNIap.getReceiptIOS();
await verifyAppleReceipt(receipt);
```

### 3. Periodic Sync

Sync subscription status periodically (e.g., on app launch):

```typescript
// On app launch
const subscriptions = await getMobileSubscriptions();
for (const sub of subscriptions.subscriptions) {
  await syncSubscription(sub.id);
}
```

### 4. Error Handling

Handle verification errors gracefully:

```typescript
try {
  const result = await verifyPurchase(purchase);
  if (!result.success) {
    // Show error to user
    console.error(result.error);
  }
} catch (error) {
  // Network error - retry later
  console.error('Network error:', error);
}
```

### 5. Idempotency

The API is idempotent - you can safely retry verification with the same purchase token/receipt.

---

## Testing

### Google Play (Sandbox)

1. Create test accounts in Google Play Console
2. Use test products
3. Test purchases will be verified against sandbox

### Apple App Store (Sandbox)

1. Create sandbox test accounts
2. Sign out of production App Store account
3. Test purchases will be verified against sandbox automatically

---

## Troubleshooting

### Google Play: "Purchase not found"
- Ensure service account has correct permissions
- Check package name matches exactly
- Verify purchase token is valid

### Apple: "Receipt verification failed"
- Check shared secret is correct
- Ensure receipt is base64 encoded
- Verify bundle ID matches

### Subscription shows as inactive
- Call `syncSubscription` to refresh status
- Check if subscription expired
- Verify with store directly

---

## Security Notes

1. **Never store purchase tokens/receipts in client code**
2. **Always verify on server** - client-side verification can be bypassed
3. **Use HTTPS** for all API calls
4. **Validate user authentication** before processing purchases
5. **Log all verification attempts** for audit purposes
