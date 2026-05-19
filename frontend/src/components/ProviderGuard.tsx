"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProviderAuth } from "@/lib/provider-auth";

export default function ProviderGuard({ children }: { children: React.ReactNode }) {
  const { provider, loading } = useProviderAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !provider) router.replace("/provider/login");
  }, [provider, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  if (!provider) return null;

  return <>{children}</>;
}
