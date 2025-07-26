# Auth Store Migration Notes

## Components that need Better Auth integration:

### 1. **StreamerStudio.tsx**
- Uses `user` from auth store
- Needs user object for stream key fetching
- Path: `frontend/src/components/stream/StreamerStudio.tsx`

### 2. **Layout Components** (2 versions)
- `frontend/src/components/layout/Layout.tsx`
  - Uses `isAuthenticated`, `user`
  - Uses `logout` function from useAuth hook
- `frontend/src/components/layouts/Layout.tsx`
  - Uses `isAuthenticated`, `user`, `logout`
  - Passes user data to Navigation component

### 3. **ProtectedRoute.tsx**
- Uses `isAuthenticated` to guard routes
- Redirects to `/auth` when not authenticated

### 4. **API Interceptors**
- `frontend/src/lib/axios.ts`
  - Needs token for Authorization header
  - Handles token refresh on 401
  - Calls logout on refresh failure
- `frontend/src/lib/api-client.ts`
  - Needs token for Authorization header

### 5. **Hooks**
- `useAuth.ts`
  - Main auth hook that wraps store functions
  - Provides login, register, logout functions
  - Returns user, isAuthenticated, isLoading, error
- `useSocket.ts`
  - Needs token for socket connection
- `useUserQueries.ts`
  - Needs token for API authentication
  - Needs user object for profile updates

### 6. **AuthPage.tsx**
- Uses login/register functions
- Checks isAuthenticated for redirect

## Auth Store Interface (for reference):
```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  clearError: () => void;
}
```

## User Object Properties Used:
- `id`
- `email`
- `username`
- `firstName`
- `lastName`
- `avatar` / `avatarUrl`
- `role`

## Next Steps for Better Auth Integration:
1. Create Better Auth client configuration
2. Create auth context/provider
3. Update all components to use Better Auth hooks
4. Update API interceptors to use Better Auth session
5. Implement proper logout with Better Auth