import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider } from '@/lib/firebase';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    // Safety timeout: if onAuthStateChanged doesn't fire within 5 seconds, 
    // assume something is wrong and stop loading.
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('[AuthContext] Auth state check timed out. Forcing loading to false.');
        setLoading(false);
      }
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      clearTimeout(timeoutId);
      setUser(currentUser);
      setLoading(false);
    });
    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    if (!auth) {
      toast.error('Firebase is not configured. Please check your settings.');
      return;
    }
    if (signingIn) return;

    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Signed in successfully');
    } catch (error: any) {
      console.error('Sign in error:', error);
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        // Silently handle user-initiated cancellations
        return;
      }
      if (error.code === 'auth/unauthorized-domain') {
        toast.error(`Domain not authorized: ${window.location.hostname}. Please add this to Firebase Console.`);
      } else {
        toast.error(`Sign in failed: ${error.message}`);
      }
    } finally {
      setSigningIn(false);
    }
  };

  const logout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      toast.success('Signed out successfully');
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast.error(`Sign out failed: ${error.message}`);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
