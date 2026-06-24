'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'Admin' | 'Manager' | 'Employee' | 'Instructor';
  departmentId?: string;
  departmentName?: string;
  positionId?: string;
  positionName?: string;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          // Fetch custom user data from Firestore 'employees' collection
          const q = query(collection(db, 'employees'), where('authUid', '==', firebaseUser.uid));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const empDoc = querySnapshot.docs[0];
            const userData = { id: empDoc.id, ...empDoc.data() } as User;
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData)); // optional fallback
          } else {
            console.error('No employee record found for this Firebase Auth UID:', firebaseUser.uid);
            setUser(null);
          }
        } catch (error) {
          console.error('Error fetching employee data:', error);
          setUser(null);
        }
      } else {
        setUser(null);
        localStorage.removeItem('user');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    localStorage.removeItem('user');
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
