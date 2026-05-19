"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchAPI, loginAdmin } from "./api";

interface AdminUser {
  email: string;
}

interface AuthContextValue {
  admin: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  token: string | null; // Token is now in httpOnly cookie, this is just for reference
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ADMIN_KEY = "prowider_admin_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Check authentication status on mount and when token might have changed
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await fetchAPI("/auth/admin/me", {
          method: "GET",
        });
        setAdmin(data);
      } catch (error) {
        // fetchAPI throws an error for non-2xx responses,
        // so we can clear the user state here.
        // We silently ignore "Unauthorized" as it's expected for logged-out users.
        if (error instanceof Error && !error.message.includes("Unauthorized")) {
          console.error("Auth check failed:", error);
        }
        localStorage.removeItem(ADMIN_KEY);
        setAdmin(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await loginAdmin(email, password);
    
    // Store user info (token is in httpOnly cookie)
    localStorage.setItem(ADMIN_KEY, JSON.stringify(data.admin));
    setAdmin(data.admin);
  };

  const logout = async () => {
    try {
      await fetchAPI("/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("Logout request failed:", error);
    }
    
    // Clear client-side state
    localStorage.removeItem(ADMIN_KEY);
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout, token: null }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// For API requests - tokens are now sent via httpOnly cookies automatically
export function getStoredToken() {
  // Token is in httpOnly cookie, not accessible from JS
  // This function is kept for backwards compatibility but returns null
  return null;
}
