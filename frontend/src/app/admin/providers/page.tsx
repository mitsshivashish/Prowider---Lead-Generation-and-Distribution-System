"use client";

import { useCallback, useEffect, useState } from "react";
import Header from "@/components/Header";
import AdminGuard from "@/components/AdminGuard";
import {
  getAdminProviderDetails,
  getProviders,
  type ProviderLead,
  type ProviderSummary,
} from "@/lib/api";

interface ProviderDetails {
  provider: Pick<ProviderSummary, "id" | "name" | "email" | "monthlyQuota">;
  leadsCount: number;
  remainingQuota: number;
  leads: ProviderLead[];
}

function AdminProvidersDashboard() {
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);
  const [details, setDetails] = useState<ProviderDetails | null>(null);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState("");

  const loadProviders = useCallback(async () => {
    try {
      const data = await getProviders();
      setProviders(data);
      setSelectedProviderId((current) => current ?? data[0]?.id ?? null);
    } catch (err) {
      console.error("Failed to load providers:", err);
      setError("Failed to load providers");
    } finally {
      setLoadingProviders(false);
    }
  }, []);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  useEffect(() => {
    if (!selectedProviderId) {
      setDetails(null);
      return;
    }

    const loadDetails = async () => {
      setLoadingDetails(true);
      try {
        const data = await getAdminProviderDetails(selectedProviderId);
        setDetails(data);
      } catch (err) {
        console.error("Failed to load provider details:", err);
        setError("Failed to load provider details");
      } finally {
        setLoadingDetails(false);
      }
    };

    loadDetails();
  }, [selectedProviderId]);

  const selectedProvider = providers.find((provider) => provider.id === selectedProviderId);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">All Providers</h1>
          <p className="text-gray-600 mt-1">View provider quotas and assigned leads as an admin</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loadingProviders ? (
          <p className="text-center text-gray-500 py-12">Loading providers...</p>
        ) : providers.length === 0 ? (
          <p className="text-center text-gray-500 py-12">No providers found</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <aside className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Providers</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {providers.map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => setSelectedProviderId(provider.id)}
                    className={`w-full px-5 py-4 text-left transition ${
                      selectedProviderId === provider.id
                        ? "bg-blue-50"
                        : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    <div className="font-semibold text-gray-900">{provider.name}</div>
                    <div className="text-sm text-gray-500">{provider.email}</div>
                    <div className="mt-2 text-xs text-gray-500">
                      Today: {provider.leadsToday} leads / Quota: {provider.remainingQuota}/
                      {provider.monthlyQuota}
                    </div>
                  </button>
                ))}
              </div>
            </aside>

            <section className="space-y-6">
              {selectedProvider && (
                <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedProvider.name}</h2>
                      <p className="text-gray-500">{selectedProvider.email}</p>
                    </div>
                    <span className="text-sm px-3 py-1 rounded-full bg-blue-50 text-blue-700">
                      Admin view
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                    <div className="rounded-lg bg-blue-50 p-4">
                      <p className="text-sm text-gray-600">Assigned Leads</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">
                        {details?.leadsCount ?? selectedProvider.leadsCount}
                      </p>
                    </div>
                    <div className="rounded-lg bg-green-50 p-4">
                      <p className="text-sm text-gray-600">Remaining Quota</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">
                        {details?.remainingQuota ?? selectedProvider.remainingQuota}
                      </p>
                    </div>
                    <div className="rounded-lg bg-yellow-50 p-4">
                      <p className="text-sm text-gray-600">Monthly Quota</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">
                        {selectedProvider.monthlyQuota}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900">Assigned Leads</h3>
                </div>

                {loadingDetails ? (
                  <p className="text-center text-gray-500 py-12">Loading assigned leads...</p>
                ) : !details || details.leads.length === 0 ? (
                  <p className="text-center text-gray-500 py-12">No leads assigned yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-left text-gray-500">
                        <tr>
                          <th className="py-3 px-6">Customer</th>
                          <th className="py-3 px-4">Contact</th>
                          <th className="py-3 px-4">Service</th>
                          <th className="py-3 px-4">Assignment</th>
                          <th className="py-3 px-4">Assigned</th>
                        </tr>
                      </thead>
                      <tbody>
                        {details.leads.map((lead) => (
                          <tr key={lead.id} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="py-4 px-6 font-medium text-gray-900">{lead.name}</td>
                            <td className="py-4 px-4">
                              <div>{lead.phoneNumber}</div>
                              {lead.email && <div className="text-xs text-gray-500">{lead.email}</div>}
                              <div className="text-xs text-gray-500">{lead.city}</div>
                            </td>
                            <td className="py-4 px-4">{lead.service.name}</td>
                            <td className="py-4 px-4">
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                {lead.assignmentStatus.replace(/_/g, " ")}
                              </span>
                              {lead.completedAt && (
                                <div className="text-xs text-green-700 mt-1">
                                  Completed by {details.provider.name}
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-4 text-gray-600">
                              {new Date(lead.assignedAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default function AdminProvidersPage() {
  return (
    <AdminGuard>
      <AdminProvidersDashboard />
    </AdminGuard>
  );
}
