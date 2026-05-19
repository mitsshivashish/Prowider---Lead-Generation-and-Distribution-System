"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchAPI, loginProvider } from "./api";

interface ProviderUser {
  id: number;
  name: string;
  email: string;
}

interface ProviderAuthContextValue {
  provider: ProviderUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  token: string | null;
}

const ProviderAuthContext = createContext<ProviderAuthContextValue | null>(null);

const PROVIDER_KEY = "prowider_provider_user";

export function ProviderAuthProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<ProviderUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await fetchAPI("/auth/provider/me", {
          method: "GET",
        });
        setProvider(data);
      } catch (error) {
        // fetchAPI throws an error for non-2xx responses,
        // so we can clear the user state here.
        // We silently ignore "Unauthorized" as it's expected for logged-out users.
        if (error instanceof Error && !error.message.includes("Unauthorized")) {
          console.error("Auth check failed:", error);
        }
        localStorage.removeItem(PROVIDER_KEY);
        setProvider(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await loginProvider(email, password);
    
    // Store provider info (token is in httpOnly cookie)
    localStorage.setItem(PROVIDER_KEY, JSON.stringify(data.provider));
    setProvider(data.provider);
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
    localStorage.removeItem(PROVIDER_KEY);
    setProvider(null);
  };

  return (
    <ProviderAuthContext.Provider value={{ provider, loading, login, logout, token: null }}>
      {children}
    </ProviderAuthContext.Provider>
  );
}

export function useProviderAuth() {
  const ctx = useContext(ProviderAuthContext);
  if (!ctx) throw new Error("useProviderAuth must be used within ProviderAuthProvider");
  return ctx;
}
