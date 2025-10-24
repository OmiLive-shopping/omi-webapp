import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useSession } from '@/lib/auth-client';
import { apiClient } from '@/lib/api-client';

interface AuthProviderProps {
  children: ReactNode;
}

interface ExtendedUser {
  brandSlug?: string;
}

interface AuthContextValue {
  extendedUser: ExtendedUser;
}

// Create context for any additional auth state we might need
const AuthContext = createContext<AuthContextValue>({
  extendedUser: {},
});

export function AuthProvider({ children }: AuthProviderProps) {
  const session = useSession();
  const [extendedUser, setExtendedUser] = useState<ExtendedUser>({});

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
  }, [session.isPending, session.data, session.error]);

  // Fetch brand slug when user is a brand
  useEffect(() => {
    const fetchBrandData = async () => {
      const user = session.data?.user;
      if (!user) {
        setExtendedUser({});
        return;
      }

      // Check if user has brand role
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((user as any)?.role === 'brand') {
        try {
          // Get username from user object
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const username = (user as any)?.username || user?.email?.split('@')[0];

          if (username) {
            console.log('🏢 Fetching brand data for username:', username);

            const result = await apiClient.get<{
              success: boolean;
              data: { brand?: { slug?: string } };
            }>(`/profiles/users/${username}`);

            if (result.success && result.data?.brand?.slug) {
              setExtendedUser({ brandSlug: result.data.brand.slug });
              console.log('✅ Brand slug loaded:', result.data.brand.slug);
            }
          }
        } catch (error) {
          console.error('❌ Failed to fetch brand data:', error);
        }
      } else {
        setExtendedUser({});
      }
    };

    if (!session.isPending) {
      fetchBrandData();
    }
  }, [session.data?.user, session.isPending]);

  // The session hook from Better Auth automatically:
  // 1. Checks for existing session token on mount
  // 2. Fetches session data from /v1/auth/get-session
  // 3. Maintains session state across the app

  return (
    <AuthContext.Provider value={{ extendedUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);