import { createContext, useContext, ReactNode, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';

interface AuthProviderProps {
  children: ReactNode;
}

// Create context for any additional auth state we might need
const AuthContext = createContext({});

export function AuthProvider({ children }: AuthProviderProps) {
  const session = useSession();

  // Log session state for debugging
  useEffect(() => {
    console.log('🔐 AuthProvider - Session state:', {
      isPending: session.isPending,
      isAuthenticated: !!session.data,
      hasUser: !!session.data?.user,
      hasSession: !!session.data?.session,
      error: session.error,
      fullData: session.data,
    });

    // Log cookies for debugging
    console.log('🍪 Cookies:', document.cookie);
  }, [session.isPending, session.data, session.error]);

  // The session hook from Better Auth automatically:
  // 1. Checks for existing session cookie on mount
  // 2. Fetches session data from /v1/auth/get-session
  // 3. Maintains session state across the app
  
  return (
    <AuthContext.Provider value={{}}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);