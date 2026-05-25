"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { auth, db } from "@/src/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { setSession, clearAllAppSession } from "@/src/lib/functions";
import { User as FirestoreUser } from "@/src/lib/firestore/types";
import { BreadcrumbProvider } from "@/src/contexts/BreadcrumbContext";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userData: FirestoreUser | null;
  refreshUserData: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<FirestoreUser | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  const fetchUserData = useCallback(async (uid: string) => {
    try {
      const userRef = doc(db, "users", uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        setUserData({ id: uid, ...data } as FirestoreUser);
        Object.entries(data).forEach(([k, v]) => setSession(k, v));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        setSession("uid", u.uid);
        await fetchUserData(u.uid);
      } else {
        setUser(null);
        setUserData(null);
        if (initialized.current) {
          clearAllAppSession();
        }
      }
      setLoading(false);
      initialized.current = true;
    });
    return () => unsubscribe();
  }, [fetchUserData]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        userData,
        isAdmin: userData?.isSystemAdmin || false,
        refreshUserData: async () => {
          if (user) await fetchUserData(user.uid);
        },
      }}
    >
      <BreadcrumbProvider>
        {children}
      </BreadcrumbProvider>
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
