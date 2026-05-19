"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import AdminGuard from "@/components/AdminGuard";
import {
  decideCompletionRequest,
  deleteLead,
  getLeads,
  updateLeadStatus,
  apiUrl,
  type Lead,
  type ProviderAssignment,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

const STATUS_OPTIONS = ["all", "pending", "viewed", "contacted", "pending_confirmation", "completed", "disputed"] as const;

const statusBadge = (status: string) => {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    viewed: "bg-blue-100 text-blue-800",
    contacted: "bg-purple-100 text-purple-800",
    pending_confirmation: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    disputed: "bg-red-100 text-red-700",
  };
  return styles[status] ?? "bg-gray-100 text-gray-800";
};

function AdminDashboard() {
  const router = useRouter();
  const { logout } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filtered, setFiltered] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>("all");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      // Destructure the leads array from the paginated response object
      const { leads: fetchedLeads } = await getLeads();
      setLeads(fetchedLeads);
    } catch (err: any) {
      if (err?.message === "Unauthorized" || err?.message?.includes("401")) {
        logout();
        router.replace("/login");
        return;
      }
      setMessage({ type: "error", text: "Failed to load enquiries" });
    } finally {
      setLoading(false);
    }
  }, [logout, router]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    // Establish a real-time connection for live updates
    const eventSource = new EventSource(apiUrl("/events"), { withCredentials: true });
    
    // Background polling as fallback
    const interval = setInterval(() => {
      fetchLeads();
    }, 5000); // Auto-refresh silently every 5 seconds

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Refresh on any backend event (ignoring generic heartbeat pings if present)
        if (data.type !== "ping") {
          fetchLeads();
        }
      } catch (err) {
        // Ignore parse errors
      }
    };

    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, [fetchLeads]);

  useEffect(() => {
    let result = leads;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          (l.email?.toLowerCase().includes(q) ?? false) ||
          l.phoneNumber.includes(q)
      );
    }
    if (serviceFilter !== "all") {
      result = result.filter((l) => l.service.name === serviceFilter);
    }
    if (statusFilter !== "all") {
      result = result.filter((l) => l.status === statusFilter);
    }
    setFiltered(result);
  }, [leads, search, serviceFilter, statusFilter]);

  const handleStatus = async (id: number, status: string) => {
    try {
      const updated = await updateLeadStatus(id, status);
      setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
      setMessage({ type: "success", text: "Status updated" });
    } catch {
      setMessage({ type: "error", text: "Failed to update status" });
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete enquiry from ${name}?`)) return;
    try {
      await deleteLead(id);
      setLeads((prev) => prev.filter((l) => l.id !== id));
      setMessage({ type: "success", text: "Enquiry deleted" });
    } catch {
      setMessage({ type: "error", text: "Failed to delete enquiry" });
    }
  };

  const handleCompletionDecision = async (
    leadId: number,
    providerId: number,
    action: "approve" | "reject"
  ) => {
    try {
      await decideCompletionRequest(leadId, providerId, action);
      await fetchLeads();
      setMessage({
        type: "success",
        text:
          action === "approve"
            ? "Completion request restored for provider"
            : "Provider rejected and lead reassigned",
      });
    } catch {
      setMessage({ type: "error", text: "Failed to update completion request" });
    }
  };

  const completedProvider = (assignments?: ProviderAssignment[]) =>
    assignments?.find((assignment) => assignment.status === "completed");

  const completionRequester = (assignments?: ProviderAssignment[]) =>
    assignments?.find((assignment) =>
      ["pending_customer_confirmation", "disputed", "completed"].includes(assignment.status)
    );

  const disputedAssignments = (assignments?: ProviderAssignment[]) =>
    assignments?.filter((assignment) => assignment.status === "disputed") ?? [];

  const disputedAssignment = (assignments?: ProviderAssignment[]) =>
    disputedAssignments(assignments)[0];

  const assignmentLabel = (status: string) => {
    const labels: Record<string, string> = {
      assigned: "assigned",
      pending_customer_confirmation: "requested completion",
      disputed: "disputed",
      completed: "completed",
      rejected: "rejected",
    };

    return labels[status] ?? status;
  };

  const serviceNames = [...new Set(leads.map((l) => l.service.name))];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-4">
            <h1 className="text-3xl font-bold text-gray-900">ProWider Admin Dashboard</h1>
            <span className="text-sm px-3 py-1 rounded-full bg-green-100 text-green-700 font-medium whitespace-nowrap self-start sm:self-auto">
              ● Auto-refreshing
            </span>
          </div>
          <p className="text-gray-600 mb-8">Manage service enquiries and bookings</p>

          {message && (
            <div
              className={`mb-6 p-4 rounded-lg text-sm ${
                message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
              }`}
            >
              {message.text}
            </div>
          )}

          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
              />
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
              >
                <option value="all">All Services</option>
                {serviceNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s === "all" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <p className="text-center text-gray-500 py-12">Loading enquiries...</p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-gray-500 py-12">No enquiries found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-3 pr-4">Customer</th>
                      <th className="py-3 pr-4">Contact</th>
                      <th className="py-3 pr-4">Service</th>
                      <th className="py-3 pr-4">Date</th>
                      <th className="py-3 pr-4">Preferred Date</th>
                      <th className="py-3 pr-4">Status</th>
                      <th className="py-3 pr-4">Assigned Providers</th>
                      <th className="py-3 pr-4">Completion</th>
                      <th className="py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((lead) => {
                      const disputed = disputedAssignment(lead.assignedProviders);

                      return (
                      <tr key={lead.id} className="border-b hover:bg-gray-50 align-top">
                        <td className="py-4 pr-4 font-medium text-gray-900">{lead.name}</td>
                        <td className="py-4 pr-4">
                          <div>{lead.phoneNumber}</div>
                          {lead.email && <div className="text-gray-500 text-xs">{lead.email}</div>}
                          <div className="text-gray-500 text-xs">{lead.city}</div>
                        </td>
                        <td className="py-4 pr-4">{lead.service.name}</td>
                        <td className="py-4 pr-4 text-gray-600">
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-4 pr-4 font-medium text-gray-900">
                          {lead.serviceDate ? new Date(lead.serviceDate).toLocaleDateString(undefined, { timeZone: "UTC" }) : "-"}
                        </td>
                        <td className="py-4 pr-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge(lead.status)}`}>
                            {lead.status === "pending_confirmation"
                              ? "pending confirmation from customer"
                              : lead.status}
                          </span>
                        </td>
                        <td className="py-4 pr-4">
                          {lead.assignedProviders && lead.assignedProviders.length > 0 ? (
                            <div className="space-y-1">
                              {lead.assignedProviders.map((assignment) => (
                                <div key={assignment.id} className="text-xs">
                                  <span className="font-medium text-gray-900">{assignment.provider.name}</span>
                                  <span className="text-gray-500"> - {assignmentLabel(assignment.status)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">No providers assigned</span>
                          )}
                        </td>
                        <td className="py-4 pr-4">
                          {completedProvider(lead.assignedProviders) ? (
                            <div>
                              <div className="font-medium text-green-700">
                                {completedProvider(lead.assignedProviders)?.provider.name}
                              </div>
                              <div className="text-xs text-gray-500">completed this lead</div>
                            </div>
                          ) : disputedAssignments(lead.assignedProviders).length > 0 ? (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-2">
                              <div className="font-medium text-red-900">{disputed?.provider.name}</div>
                              <div className="text-xs text-red-800">customer disputed completion</div>
                              {disputed?.completionNote && (
                                <div className="text-xs text-red-800 mt-1">{disputed.completionNote}</div>
                              )}
                            </div>
                          ) : lead.status === "pending_confirmation" ? (
                            <div>
                              <div className="text-xs text-yellow-700">Pending confirmation from customer</div>
                              {completionRequester(lead.assignedProviders) && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Requested by {completionRequester(lead.assignedProviders)?.provider.name}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">No dispute</span>
                          )}
                        </td>
                        <td className="py-4">
                          <div className="flex flex-wrap gap-1">
                            {disputed && (
                              <>
                                <button
                                  onClick={() => handleCompletionDecision(lead.id, disputed.providerId, "approve")}
                                  className="text-xs px-2 py-1 border border-green-200 rounded hover:bg-green-50 text-green-700"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleCompletionDecision(lead.id, disputed.providerId, "reject")}
                                  className="text-xs px-2 py-1 border border-red-200 rounded hover:bg-red-50 text-red-600"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            <button onClick={() => handleDelete(lead.id, lead.name)} className="text-xs px-2 py-1 border border-red-200 rounded hover:bg-red-50 text-red-600">
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminDashboard />
    </AdminGuard>
  );
}
