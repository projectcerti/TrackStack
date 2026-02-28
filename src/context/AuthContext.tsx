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

  useEffect(() => {
    if (!auth) {
      console.warn('[AuthContext] Firebase auth is not initialized.');
      setLoading(false);
      return;
    }
    console.log('[AuthContext] Setting up onAuthStateChanged listener.');
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('[AuthContext] Auth state changed. Current user:', currentUser ? currentUser.email : 'None');
      setUser(currentUser);
      setLoading(false);
    }, (error) => {
      console.error('[AuthContext] onAuthStateChanged error:', error);
      setLoading(false);
    });
    return () => {
      console.log('[AuthContext] Cleaning up onAuthStateChanged listener.');
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    if (!auth) {
      console.error('[AuthContext] signInWithGoogle called but auth is not configured.');
      toast.error('Firebase is not configured. Please check your settings.');
      return;
    }
    try {
      console.log('[AuthContext] Initiating signInWithPopup with GoogleProvider.');
      const result = await signInWithPopup(auth, googleProvider);
      console.log('[AuthContext] signInWithPopup successful. User:', result.user.email);
      toast.success('Signed in successfully');
    } catch (error: any) {
      console.error('[AuthContext] Sign in error details:', {
        code: error.code,
        message: error.message,
        customData: error.customData,
        name: error.name
      });
      if (error.code === 'auth/unauthorized-domain') {
        toast.error(`Domain not authorized: ${window.location.hostname}. Please add this to Firebase Console.`);
      } else if (error.code === 'auth/popup-closed-by-user') {
        toast.error('Sign in cancelled: The popup was closed before completing the sign in.');
      } else {
        toast.error(`Sign in failed: ${error.message}`);
      }
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
