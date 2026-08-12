'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiUrl } from '../lib/api';

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let isMounted = true;

    const checkUserSession = async () => {
      if (pathname === '/login') {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(apiUrl('/api/auth/me'), {
          method: 'GET',
          credentials: 'include',
        });

        if (isMounted) {
          if (response.ok) {
            const data = await response.json();
            setUser(data.data.user);
          } else {
            setUser(null);
            router.replace('/login');
          }
        }
      } catch (error: unknown) {
        console.error('Session check failed', error);
        if (isMounted) {
          setUser(null);
          router.replace('/login');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkUserSession();

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const logout = useCallback(async () => {
    try {
      await fetch(apiUrl('/api/auth/logout'), {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error: unknown) {
      console.error('Logout error', error);
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
