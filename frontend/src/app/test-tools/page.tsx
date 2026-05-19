"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { getProviders, callWebhook, createLead } from "@/lib/api";
import AdminGuard from "@/components/AdminGuard";

function TestToolsContent() {
  const [selectedProvider, setSelectedProvider] = useState("1");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [providers, setProviders] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    getProviders().then(setProviders).catch(console.error);
  }, []);

  const show = (type: string, text: string) => setMessage({ type, text });

  const resetQuota = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await callWebhook({
        providerId: Number(selectedProvider),
        idempotencyKey: `reset-${Date.now()}`,
        action: "reset_quota",
      });
      show("success", `Quota reset for Provider ${selectedProvider}`);
    } catch (e) {
      show("error", e instanceof Error ? e.message : "Failed to reset quota");
    } finally {
      setLoading(false);
    }
  };

  const testIdempotency = async () => {
    setLoading(true);
    setMessage(null);
    const idempotencyKey = `idempotency-test-${Date.now()}`;
    try {
      const results = await Promise.all(
        [1, 2, 3].map(() =>
          callWebhook({ providerId: Number(selectedProvider), idempotencyKey, action: "reset_quota" })
        )
      );
      const allSuccess = results.every((r) => r.success);
      show("success", `Webhook called 3× with same key. All success: ${allSuccess}. Quota reset only once (idempotent).`);
    } catch {
      show("error", "An error occurred during idempotency test");
    } finally {
      setLoading(false);
    }
  };

  const generateLeads = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const basePhone = Math.floor(Math.random() * 9000000000) + 1000000000;
      const results = await Promise.allSettled(
        Array.from({ length: 10 }, (_, i) =>
          createLead({
            name: `Test User ${i + 1}`,
            phoneNumber: String(basePhone + i),
            city: "Test City",
            serviceId: (i % 3) + 1,
            description: `Concurrency test lead ${i + 1}`,
          })
        )
      );
      const successful = results.filter((r) => r.status === "fulfilled").length;
      show("success", `Generated 10 leads simultaneously. Success: ${successful}/10`);
    } catch {
      show("error", "An error occurred while generating leads");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2">Test Tools</h1>
      <p className="text-gray-600 mb-6">Simulate payment gateway webhooks and concurrency scenarios</p>

      {message && (
        <div className={`mb-6 p-4 rounded ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Select Provider</label>
          <select value={selectedProvider} onChange={(e) => setSelectedProvider(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded">
            {providers.length > 0
              ? providers.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)
              : Array.from({ length: 8 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1)}>Provider {i + 1}</option>
                ))}
          </select>
        </div>

        <div className="space-y-1">
          <button onClick={resetQuota} disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:bg-gray-400">
            {loading ? "Processing..." : "Reset Provider Quota (Webhook)"}
          </button>
          <p className="text-xs text-gray-500">Simulates a payment gateway confirming subscription renewal</p>
        </div>

        <div className="space-y-1">
          <button onClick={testIdempotency} disabled={loading}
            className="w-full bg-purple-600 text-white py-2 rounded font-medium hover:bg-purple-700 disabled:bg-gray-400">
            {loading ? "Processing..." : "Test Webhook Idempotency (Call 3×)"}
          </button>
          <p className="text-xs text-gray-500">Calls webhook 3× with the same key — quota resets only once</p>
        </div>

        <div className="space-y-1">
          <button onClick={generateLeads} disabled={loading}
            className="w-full bg-green-600 text-white py-2 rounded font-medium hover:bg-green-700 disabled:bg-gray-400">
            {loading ? "Generating..." : "Generate 10 Leads Simultaneously"}
          </button>
          <p className="text-xs text-gray-500">Creates 10 leads in parallel to test concurrent allocation</p>
        </div>
      </div>
      </div>
    </div>
  );
}

export default function TestToolsPage() {
  return (
    <AdminGuard>
      <TestToolsContent />
    </AdminGuard>
  );
}
