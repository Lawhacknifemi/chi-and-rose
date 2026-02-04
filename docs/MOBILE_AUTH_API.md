# Mobile Authentication API

Complete guide for implementing authentication in mobile clients (iOS/Android/React Native).

## Base URL

```
https://your-api-domain.com/api/auth
```

For local development:
```
http://localhost:3000/api/auth
```

## Authentication Flow

1. **Sign Up** or **Sign In** → Get session token
2. **Store token** securely on device
3. **Include token** in `Authorization: Bearer <token>` header for all API requests
4. **Refresh token** when it expires (use `/api/auth/session` to check)

---

## Endpoints

### 1. Sign Up (Create Account)

**Endpoint:** `POST /api/auth/sign-up`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "User Name"
}
```

**Response (Success):**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "emailVerified": false,
    "image": null,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "session": {
    "id": "session_id",
    "expiresAt": "2024-01-08T00:00:00.000Z",
    "token": "session_token_here"  // Use this for Authorization header
  }
}
```

**Response (Error):**
```json
{
  "error": {
    "message": "Email already exists",
    "code": "EMAIL_ALREADY_EXISTS"
  }
}
```

**Example (React Native):**
```typescript
const signUp = async (email: string, password: string, name: string) => {
  const response = await fetch(`${API_URL}/api/auth/sign-up`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, name }),
  });

  const data = await response.json();
  
  if (response.ok && data.session?.token) {
    // Store token securely (e.g., using SecureStore or Keychain)
    await SecureStore.setItemAsync('sessionToken', data.session.token);
    await SecureStore.setItemAsync('userId', data.user.id);
    return data;
  }
  
  throw new Error(data.error?.message || 'Sign up failed');
};
```

**Example (iOS/Swift):**
```swift
func signUp(email: String, password: String, name: String) async throws -> AuthResponse {
    let url = URL(string: "\(baseURL)/api/auth/sign-up")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    let body: [String: Any] = [
        "email": email,
        "password": password,
        "name": name
    ]
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)
    
    let (data, response) = try await URLSession.shared.data(for: request)
    
    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode == 200 else {
        throw AuthError.signUpFailed
    }
    
    let authResponse = try JSONDecoder().decode(AuthResponse.self, from: data)
    
    // Store token in Keychain
    KeychainHelper.save(token: authResponse.session.token, for: "sessionToken")
    KeychainHelper.save(userId: authResponse.user.id, for: "userId")
    
    return authResponse
}
```

**Example (Android/Kotlin):**
```kotlin
suspend fun signUp(email: String, password: String, name: String): AuthResponse {
    val requestBody = mapOf(
        "email" to email,
        "password" to password,
        "name" to name
    )
    
    val response = httpClient.post("$baseUrl/api/auth/sign-up") {
        contentType(ContentType.Application.Json)
        setBody(requestBody)
    }
    
    if (response.status.value != 200) {
        throw AuthException("Sign up failed")
    }
    
    val authResponse = response.body<AuthResponse>()
    
    // Store token securely (e.g., using EncryptedSharedPreferences)
    tokenStorage.saveToken(authResponse.session.token)
    tokenStorage.saveUserId(authResponse.user.id)
    
    return authResponse
}
```

---

### 2. Sign In (Existing Account)

**Endpoint:** `POST /api/auth/sign-in/email`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (Success):**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "emailVerified": false,
    "image": null
  },
  "session": {
    "id": "session_id",
    "expiresAt": "2024-01-08T00:00:00.000Z",
    "token": "session_token_here"  // Use this for Authorization header
  }
}
```

**Response (Error):**
```json
{
  "error": {
    "message": "Invalid email or password",
    "code": "INVALID_CREDENTIALS"
  }
}
```

**Example (React Native):**
```typescript
const signIn = async (email: string, password: string) => {
  const response = await fetch(`${API_URL}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  
  if (response.ok && data.session?.token) {
    await SecureStore.setItemAsync('sessionToken', data.session.token);
    await SecureStore.setItemAsync('userId', data.user.id);
    return data;
  }
  
  throw new Error(data.error?.message || 'Sign in failed');
};
```

---

### 3. Get Current Session

**Endpoint:** `GET /api/auth/session`

**Headers:**
```
Authorization: Bearer <session_token>
```

**Response (Authenticated):**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "emailVerified": false,
    "image": null
  },
  "session": {
    "id": "session_id",
    "expiresAt": "2024-01-08T00:00:00.000Z",
    "token": "session_token_here"
  }
}
```

**Response (Not Authenticated):**
```json
{
  "user": null,
  "session": null
}
```

**Example (React Native):**
```typescript
const getSession = async () => {
  const token = await SecureStore.getItemAsync('sessionToken');
  
  if (!token) {
    return null;
  }
  
  const response = await fetch(`${API_URL}/api/auth/session`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  const data = await response.json();
  
  if (data.session) {
    return data;
  }
  
  // Token expired or invalid - clear stored token
  await SecureStore.deleteItemAsync('sessionToken');
  return null;
};
```

---

### 4. Sign Out

**Endpoint:** `POST /api/auth/sign-out`

**Headers:**
```
Authorization: Bearer <session_token>
```

**Response:**
```json
{
  "message": "Signed out successfully"
}
```

**Example (React Native):**
```typescript
const signOut = async () => {
  const token = await SecureStore.getItemAsync('sessionToken');
  
  if (token) {
    await fetch(`${API_URL}/api/auth/sign-out`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }
  
  // Clear stored tokens
  await SecureStore.deleteItemAsync('sessionToken');
  await SecureStore.deleteItemAsync('userId');
};
```

---

## Using Authentication in API Requests

After signing in, include the session token in all authenticated requests:

**Example:**
```typescript
const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
  const token = await SecureStore.getItemAsync('sessionToken');
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
};

// Usage
const subscriptions = await makeAuthenticatedRequest(
  `${API_URL}/rpc/subscriptions.getSubscriptions`
);
```

---

## Complete Mobile Auth Implementation

### React Native Example

```typescript
import * as SecureStore from 'expo-secure-store';

const API_URL = 'http://localhost:3000';

class AuthService {
  private async getToken(): Promise<string | null> {
    return await SecureStore.getItemAsync('sessionToken');
  }

  private async saveToken(token: string): Promise<void> {
    await SecureStore.setItemAsync('sessionToken', token);
  }

  private async clearToken(): Promise<void> {
    await SecureStore.deleteItemAsync('sessionToken');
  }

  async signUp(email: string, password: string, name: string) {
    const response = await fetch(`${API_URL}/api/auth/sign-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    const data = await response.json();
    
    if (response.ok && data.session?.token) {
      await this.saveToken(data.session.token);
      return data;
    }
    
    throw new Error(data.error?.message || 'Sign up failed');
  }

  async signIn(email: string, password: string) {
    const response = await fetch(`${API_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    if (response.ok && data.session?.token) {
      await this.saveToken(data.session.token);
      return data;
    }
    
    throw new Error(data.error?.message || 'Sign in failed');
  }

  async signOut() {
    const token = await this.getToken();
    
    if (token) {
      await fetch(`${API_URL}/api/auth/sign-out`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
    }
    
    await this.clearToken();
  }

  async getSession() {
    const token = await this.getToken();
    
    if (!token) return null;
    
    const response = await fetch(`${API_URL}/api/auth/session`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    const data = await response.json();
    
    if (data.session) {
      return data;
    }
    
    await this.clearToken();
    return null;
  }

  async makeAuthenticatedRequest(url: string, options: RequestInit = {}) {
    const token = await this.getToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }
    
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }
}

export const authService = new AuthService();
```

---

## Error Handling

### Common Error Codes

- `EMAIL_ALREADY_EXISTS` - Email is already registered
- `INVALID_CREDENTIALS` - Wrong email or password
- `UNAUTHORIZED` - Invalid or expired token
- `VALIDATION_ERROR` - Invalid input data

### Error Response Format

```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "status": 400
  }
}
```

---

## Security Best Practices

1. **Store tokens securely:**
   - iOS: Use Keychain
   - Android: Use EncryptedSharedPreferences or Keystore
   - React Native: Use `expo-secure-store` or `react-native-keychain`

2. **Handle token expiration:**
   - Check session validity on app launch
   - Refresh token before expiration
   - Automatically sign out if token is invalid

3. **Use HTTPS in production:**
   - Never send tokens over HTTP
   - Validate SSL certificates

4. **Implement token refresh:**
   - Check session expiry before making requests
   - Re-authenticate if token expired

---

## Testing

### Test Sign Up

```bash
curl -X POST http://localhost:3000/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

### Test Sign In

```bash
curl -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Test Get Session (with token)

```bash
curl -X GET http://localhost:3000/api/auth/session \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

---

## Next Steps

After authentication, use the session token to access protected endpoints:

- **Subscriptions:** `/rpc/subscriptions.getSubscriptions`
- **Check Access:** `/rpc/subscriptions.hasAccess`
- **Verify Purchases:** `/rpc/subscriptions.verifyGooglePlay`, `/rpc/subscriptions.verifyApple`

See [MOBILE_API.md](./MOBILE_API.md) for subscription endpoints.
