"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useProviderAuth } from "@/lib/provider-auth";

export default function Header() {
  const { admin, logout: adminLogout } = useAuth();
  const { provider, logout: providerLogout } = useProviderAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdminArea =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/test-tools");
  const isProviderArea = pathname.startsWith("/provider");

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-2xl font-bold text-blue-600 tracking-tight">
            ProWider
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {!provider && (
              <Link href="/#services" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                Browse Services
              </Link>
            )}
            {provider ? (
              <div className="flex items-center gap-3 ml-2">
                <Link
                  href="/provider/dashboard"
                  className="text-sm px-4 py-2 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 font-medium transition-colors"
                >
                  My Tasks
                </Link>
                <button
                  onClick={providerLogout}
                  className="text-sm px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-medium transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : admin ? (
              <div className="flex items-center gap-3 ml-2">
                <Link
                  href="/admin"
                  className="text-sm px-4 py-2 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 font-medium transition-colors"
                >
                  Admin Dashboard
                </Link>
                <Link
                  href="/admin/providers"
                  className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  All Providers
                </Link>
                <button
                  onClick={adminLogout}
                  className="text-sm px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-medium transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4 ml-2">
                <Link href="/provider/login" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">
                  Provider Login
                </Link>
                <Link href="/login" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">
                  Admin Login
                </Link>
              </div>
            )}
          </nav>

          <button
            className="md:hidden p-2 text-gray-600"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-3 border-t border-gray-100 pt-3">
            {!provider && (
              <Link href="/#services" onClick={() => setMobileOpen(false)} className="block text-gray-600 hover:text-blue-600 font-medium">
                Browse Services
              </Link>
            )}
            {provider ? (
              <>
                <Link href="/provider/dashboard" onClick={() => setMobileOpen(false)} className="block text-blue-600 font-medium">
                  My Tasks
                </Link>
                <button onClick={() => { providerLogout(); setMobileOpen(false); }} className="block text-red-600 font-medium">
                  Logout
                </button>
              </>
            ) : admin ? (
              <>
                <Link href="/admin" onClick={() => setMobileOpen(false)} className="block text-blue-600 font-medium">
                  Admin Dashboard
                </Link>
                <Link href="/admin/providers" onClick={() => setMobileOpen(false)} className="block text-gray-600 font-medium">
                  All Providers
                </Link>
                <button onClick={() => { adminLogout(); setMobileOpen(false); }} className="block text-red-600 font-medium">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/provider/login" onClick={() => setMobileOpen(false)} className="block text-gray-500 font-medium">
                  Provider Login
                </Link>
                <Link href="/login" onClick={() => setMobileOpen(false)} className="block text-gray-500 font-medium">
                  Admin Login
                </Link>
              </>
            )}
          </div>
        )}
      </div>
      {isAdminArea && admin && (
        <div className="bg-blue-50 border-t border-blue-100">
          <div className="max-w-7xl mx-auto px-4 py-1.5 text-xs text-blue-700">
            Admin: {admin.email}
          </div>
        </div>
      )}
      {isProviderArea && provider && (
        <div className="bg-green-50 border-t border-green-100">
          <div className="max-w-7xl mx-auto px-4 py-1.5 text-xs text-green-700">
            Provider: {provider.name} ({provider.email})
          </div>
        </div>
      )}
    </header>
  );
}
