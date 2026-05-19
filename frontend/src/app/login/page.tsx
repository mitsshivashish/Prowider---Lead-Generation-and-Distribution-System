"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { admin, login, loading: authLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && admin) router.replace("/admin");
  }, [admin, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    console.log("Admin login handleSubmit triggered"); // DEBUGGING
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      console.log("Attempting to log in with:", { email, password }); // DEBUGGING
      await login(email, password);
      console.log("Admin login successful, redirecting..."); // DEBUGGING
      router.push("/admin");
    } catch (err) {
      console.error("Admin login failed:", err); // DEBUGGING
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
              <h1 className="text-2xl font-bold text-gray-900 mb-2">ProWider Admin</h1>
              <p className="text-gray-600 text-sm">Sign in to manage service enquiries</p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Administrator Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@prowider.com"
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
                {loading ? "Authenticating..." : "Access Admin Dashboard"}
              </button>
            </form>
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
