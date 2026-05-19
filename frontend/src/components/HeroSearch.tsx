"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SERVICE_CATALOG } from "@/lib/services";

export default function HeroSearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) {
      document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const match = SERVICE_CATALOG.find(
      (s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
    );
    if (match) {
      router.push(`/service/${match.backendServiceId}?category=${encodeURIComponent(match.name)}`);
    } else {
      document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-2 bg-white p-2 rounded-2xl shadow-xl max-w-2xl mx-auto">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="What service do you need?"
        className="flex-1 px-4 py-3 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
      >
        Search
      </button>
    </form>
  );
}
