"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useProviderAuth } from "@/lib/provider-auth";

export default function ProviderLoginPage() {
  const { provider, login, loading: authLoading } = useProviderAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && provider) router.replace("/provider/dashboard");
  }, [provider, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    console.log("Provider login handleSubmit triggered"); // DEBUGGING
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      console.log("Attempting to log in provider with:", { email, password }); // DEBUGGING
      await login(email, password);
      console.log("Provider login successful, redirecting..."); // DEBUGGING
      router.push("/provider/dashboard");
    } catch (err) {
      console.error("Provider login failed:", err); // DEBUGGING
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Provider Portal</h1>
              <p className="text-gray-600 text-sm">Sign in to view your assigned tasks</p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="provider1@prowider.com"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-gray-400">
              Demo: provider1@prowider.com through provider8@prowider.com — password: provider123
            </p>
          </div>
          <p className="text-center mt-4">
            <Link href="/" className="text-sm text-blue-600 hover:underline">
              ← Back to homepage
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
