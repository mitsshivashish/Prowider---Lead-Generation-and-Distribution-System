"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import ProviderGuard from "@/components/ProviderGuard";
import {
  apiUrl,
  getMyProviderLeads,
  getProviderProfile,
  requestLeadCompletion,
  type ProviderLead,
  type ProviderProfile,
} from "@/lib/api";
import { useProviderAuth } from "@/lib/provider-auth";

function ProviderDashboardContent() {
  const router = useRouter();
  const { provider, logout } = useProviderAuth();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [leads, setLeads] = useState<ProviderLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [completionLoadingId, setCompletionLoadingId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [profileData, leadsData] = await Promise.all([
        getProviderProfile(),
        getMyProviderLeads(),
      ]);
      setProfile(profileData);
      setLeads(leadsData.leads);
    } catch (err: any) {
      if (err?.message === "Unauthorized" || err?.message?.includes("401")) {
        logout();
        router.replace("/provider/login");
        return;
      }
      console.error("Failed to load provider data:", err);
    } finally {
      setLoading(false);
    }
  }, [logout, router]);

  useEffect(() => {
    // Fetch initial data
    refresh();

    // Establish a real-time connection for live updates
    const eventSource = new EventSource(apiUrl("/events"), { withCredentials: true });
    
    // Background polling as fallback
    const interval = setInterval(() => {
      refresh();
    }, 5000); // Auto-refresh silently every 5 seconds

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // Listen for a specific "new_lead" event from the backend
      if (data.type === "new_lead") {
        console.log("New lead received, refreshing data...");
        refresh();
      }
    };

    eventSource.onerror = (err) => {
      console.error("EventSource failed:", err);
    };

    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, [refresh]);

  const handleRequestCompletion = async (lead: ProviderLead) => {
    const note = window.prompt("Add a short completion note for customer confirmation:", "");
    if (note === null) return;

    setCompletionLoadingId(lead.id);
    try {
      await requestLeadCompletion(lead.id, note.trim() || undefined);
      await refresh();
    } catch (err) {
      console.error("Failed to request completion:", err);
      alert(err instanceof Error ? err.message : "Failed to request completion");
    } finally {
      setCompletionLoadingId(null);
    }
  };

  const assignmentBadge = (status: string) => {
    const styles: Record<string, string> = {
      assigned: "bg-gray-100 text-gray-700",
      pending_customer_confirmation: "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800",
      disputed: "bg-red-100 text-red-700",
      rejected: "bg-red-100 text-red-700",
    };

    return styles[status] ?? "bg-gray-100 text-gray-700";
  };

  const assignmentLabel = (status: string) => {
    const labels: Record<string, string> = {
      assigned: "assigned",
      pending_customer_confirmation: "completion requested",
      completed: "completed",
      disputed: "disputed",
      rejected: "rejected",
    };

    return labels[status] ?? status.replace(/_/g, " ");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto p-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Tasks</h1>
            <p className="text-gray-600 mt-1">Welcome back, {provider?.name}</p>
          </div>
          <span className="text-sm px-3 py-1 rounded-full bg-green-100 text-green-700">
            ● Auto-refreshing
          </span>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-12">Loading your tasks...</p>
        ) : (
          <>
            {profile && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500">Assigned This Month</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{profile.leadsCount}</p>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500">Remaining Quota</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{profile.remainingQuota}</p>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500">Monthly Limit</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{profile.monthlyQuota}</p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">Assigned Leads</h2>
                <p className="text-sm text-gray-500 mt-1">Only tasks assigned to you are shown here</p>
              </div>

              {leads.length === 0 ? (
                <p className="text-center text-gray-500 py-12">No tasks assigned yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-gray-500">
                        <th className="py-3 px-6">Customer</th>
                        <th className="py-3 px-4">Contact</th>
                        <th className="py-3 px-4">Service</th>
                        <th className="py-3 px-4">Preferred Date</th>
                        <th className="py-3 px-4">Assigned</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((lead) => (
                        <Fragment key={lead.id}>
                          <tr className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="py-4 px-6 font-medium text-gray-900">{lead.name}</td>
                            <td className="py-4 px-4">
                              <div>{lead.phoneNumber}</div>
                              {lead.email && <div className="text-gray-500 text-xs">{lead.email}</div>}
                              <div className="text-gray-500 text-xs">{lead.city}</div>
                            </td>
                            <td className="py-4 px-4">{lead.service.name}</td>
                            <td className="py-4 px-4 text-gray-600">
                              {lead.serviceDate ? new Date(lead.serviceDate).toLocaleDateString(undefined, { timeZone: "UTC" }) : "—"}
                            </td>
                            <td className="py-4 px-4 text-gray-600">
                              {new Date(lead.assignedAt).toLocaleString()}
                            </td>
                            <td className="py-4 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${assignmentBadge(lead.assignmentStatus)}`}>
                                {assignmentLabel(lead.assignmentStatus)}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                                  className="text-blue-600 hover:underline text-xs font-medium"
                                >
                                  {expandedId === lead.id ? "Hide" : "Details"}
                                </button>
                                {lead.assignmentStatus !== "pending_customer_confirmation" &&
                                  lead.assignmentStatus !== "completed" &&
                                  lead.assignmentStatus !== "disputed" &&
                                  lead.assignmentStatus !== "rejected" &&
                                  lead.status !== "completed" && (
                                  <button
                                    onClick={() => handleRequestCompletion(lead)}
                                    disabled={completionLoadingId === lead.id}
                                    className="text-green-700 hover:underline text-xs font-medium disabled:text-gray-400 disabled:no-underline"
                                  >
                                    {completionLoadingId === lead.id ? "Requesting..." : "Request Completion"}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {expandedId === lead.id && (
                            <tr className="bg-blue-50/50">
                              <td colSpan={7} className="px-6 py-4 text-gray-700">
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Job Details</p>
                                <p className="whitespace-pre-wrap text-sm">{lead.description}</p>
                                {lead.budget && (
                                  <p className="text-sm mt-2 text-gray-600">Budget: {lead.budget}</p>
                                )}
                                {lead.completionNote && (
                                  <p className="text-sm mt-2 text-gray-600">Completion note: {lead.completionNote}</p>
                                )}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ProviderDashboardPage() {
  return (
    <ProviderGuard>
      <ProviderDashboardContent />
    </ProviderGuard>
  );
}
