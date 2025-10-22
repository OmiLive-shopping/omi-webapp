# Bearer Token Authentication Verification Guide

## Quick Verification Steps

### 1. Browser DevTools Check (Easiest Way)

**Start the app:**
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
pnpm dev
```

**Open http://localhost:5173 and open DevTools (F12):**

#### A. Check Network Tab
1. Sign in to the app
2. Open Network tab
3. Look at any API request (like `/v1/users/profile`)
4. Check **Request Headers** - you should see:
   ```
   Authorization: Bearer eyJhbG...very.long.token
   ```
5. **You should NOT see** `Cookie: better-auth.session_token=...`

#### B. Check Application/Storage Tab
1. Go to Application tab → Local Storage → http://localhost:5173
2. You should see:
   ```
   better-auth-token: <your-jwt-token>
   ```
3. Go to Cookies → http://localhost:5173
4. **You should NOT see** any `better-auth.session_token` cookie

#### C. Check Console Logs
When you sign in, you should see:
```
[Auth Client] Storing token in localStorage
[API Client] Using Bearer token from response
```

### 2. Test Authentication Flow

**Sign Up Flow:**
```
1. Go to /auth/signup
2. Fill in the form
3. Submit
4. Check DevTools Network tab for POST /v1/auth/sign-up/email
5. Response should include: { data: { token: "...", user: {...}, session: {...} } }
6. Check localStorage for "better-auth-token"
```

**Sign In Flow:**
```
1. Go to /auth/signin
2. Fill in credentials
3. Submit
4. Check Network tab for POST /v1/auth/sign-in/email
5. Should see Authorization header in subsequent requests
6. Navigate to /profile - should load without errors
```

**API Request Flow:**
```
1. While signed in, go to /brand (if you have brand access)
2. Open Network tab
3. Check GET /v1/brands/products request
4. Headers should show: Authorization: Bearer <token>
5. Should NOT show Cookie header with auth data
```

**WebSocket Flow:**
```
1. Go to /vdo-ninja-test or any live stream page
2. Open Network tab → WS (WebSocket)
3. Click on the WebSocket connection
4. Check "Messages" tab
5. Initial handshake should include: { auth: { token: "..." } }
6. Should NOT see cookie-based auth
```

### 3. Backend Verification

**Check backend logs while making requests:**

```bash
cd backend
npm run dev

# You should see:
🔐 [Socket Auth] Authenticating with Bearer token: eyJ...
✅ [Socket Auth] User authenticated: <user-id>

# NOT:
🔐 [Socket Auth] Authenticating with cookies...
```

### 4. Manual API Test (cURL)

**Get a token first:**
```bash
# Sign in and get token
curl -X POST http://localhost:9000/v1/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "yourpassword"
  }'

# Copy the token from response
```

**Test authenticated endpoint with token:**
```bash
curl http://localhost:9000/v1/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Should return user data
```

**Test without token (should fail):**
```bash
curl http://localhost:9000/v1/users/profile

# Should return 401 Unauthorized
```

### 5. Cookie vs Token Comparison

**OLD (Cookie-based) - What you should NOT see:**
```
Request Headers:
  Cookie: better-auth.session_token=abc123xyz...
  credentials: 'include'

Response Headers:
  Set-Cookie: better-auth.session_token=abc123xyz...; HttpOnly; Secure
```

**NEW (Bearer Token) - What you SHOULD see:**
```
Request Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Local Storage:
  better-auth-token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

WebSocket Auth:
  { auth: { token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." } }
```

## Common Issues & Fixes

### Issue: Still seeing cookies
**Fix:** Clear browser storage
```
DevTools → Application → Clear Storage → Clear Site Data
Then sign in again
```

### Issue: 401 Unauthorized errors
**Fix:** Check if token is in localStorage
```javascript
// In browser console:
localStorage.getItem('better-auth-token')

// Should return a JWT token
// If null, sign in again
```

### Issue: WebSocket not connecting
**Fix:** Check socket auth
```javascript
// In browser console while on a page with sockets:
// Should see token in auth handshake
```

## Success Criteria

✅ **No `better-auth.session_token` cookies in browser**
✅ **All API requests have `Authorization: Bearer` header**
✅ **Token stored in `localStorage` as `better-auth-token`**
✅ **WebSocket connections use `auth: { token }` in handshake**
✅ **Backend logs show "Bearer token" authentication**
✅ **No `credentials: 'include'` in network requests**
✅ **Sign in/out works correctly**
✅ **Protected routes require valid token**

## Quick Smoke Test

```bash
# 1. Start both servers
cd backend && npm run dev &
cd frontend && pnpm dev

# 2. Open http://localhost:5173
# 3. Open DevTools (F12) → Application → Local Storage
# 4. Clear all data
# 5. Sign in
# 6. Check:
#    - localStorage has "better-auth-token"
#    - Network requests have "Authorization: Bearer..."
#    - No auth-related cookies
# 7. Navigate to /profile
# 8. Should load successfully with token
```

If all checks pass, Bearer token authentication is working! 🎉
