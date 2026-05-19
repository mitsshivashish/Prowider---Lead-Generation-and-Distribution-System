"use client";

import { useEffect, useState, FormEvent } from "react";
import Header from "@/components/Header";
import { getCustomerLeads, submitCustomerCompletionDecision, type Lead } from "@/lib/api";

export default function CustomerDashboard() {
  const [email, setEmail] = useState("");
  const [inputEmail, setInputEmail] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    // Check if the customer previously logged in
    const savedEmail = localStorage.getItem("prowider_customer_email");
    if (savedEmail) {
      setEmail(savedEmail);
      fetchLeads(savedEmail);
    }
  }, []);

  const fetchLeads = async (customerEmail: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await getCustomerLeads(customerEmail);
      setLeads(res.leads);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (!inputEmail) return;
    localStorage.setItem("prowider_customer_email", inputEmail);
    setEmail(inputEmail);
    fetchLeads(inputEmail);
  };

  const handleLogout = () => {
    localStorage.removeItem("prowider_customer_email");
    setEmail("");
    setLeads([]);
  };

  const handleDecision = async (leadId: number, providerId: number, action: "confirm" | "dispute") => {
    setProcessingId(`${leadId}-${providerId}`);
    try {
      await submitCustomerCompletionDecision(leadId, providerId, action);
      await fetchLeads(email); // Refresh data instantly after decision
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to submit decision");
    } finally {
      setProcessingId(null);
    }
  };

  // Login Screen
  if (!email) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-md w-full">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Customer Portal</h1>
            <p className="text-gray-600 mb-6">Enter your email to view your service requests and confirm completions.</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="you@example.com"
                />
              </div>
              <button type="submit" className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition">
                View My Requests
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  // Dashboard Screen
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Requests</h1>
            <p className="text-gray-600 mt-1">Logged in as {email}</p>
          </div>
          <button onClick={handleLogout} className="text-gray-500 hover:text-gray-700 font-medium">
            Logout
          </button>
        </div>

        {error && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>}

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading your requests...</div>
        ) : leads.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm text-gray-500">
            You haven't submitted any service requests yet.
          </div>
        ) : (
          <div className="space-y-6">
            {leads.map((lead) => (
              <div key={lead.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{lead.service?.name} Request</h2>
                    <p className="text-sm text-gray-500">Submitted on {new Date(lead.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className="px-3 py-1 bg-gray-200 text-gray-800 rounded-full text-xs font-medium uppercase tracking-wider">
                    {lead.status}
                  </span>
                </div>
                <div className="p-6">
                  <p className="text-gray-700 mb-4">{lead.description}</p>

                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Provider Assignments</h3>
                    {lead.assignedProviders && lead.assignedProviders.length > 0 ? (
                      <div className="space-y-3">
                        {lead.assignedProviders.map((assignment) => (
                          <div key={assignment.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-100 bg-gray-50">
                            <div>
                              <p className="font-medium text-gray-900">{assignment.provider?.name}</p>
                              <p className="text-sm text-gray-500">Assigned: {new Date(assignment.assignedAt).toLocaleDateString()}</p>
                              <p className="text-sm mt-1">
                                Status: <span className="font-medium text-gray-700 capitalize">{assignment.status.replace(/_/g, " ")}</span>
                              </p>
                            </div>

                            {assignment.status === "pending_customer_confirmation" && (
                              <div className="flex flex-col sm:flex-row gap-2">
                                <button
                                  onClick={() => handleDecision(lead.id, assignment.providerId, "confirm")}
                                  disabled={processingId === `${lead.id}-${assignment.providerId}`}
                                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                                >
                                  {processingId === `${lead.id}-${assignment.providerId}` ? "Processing..." : "Confirm Work Done"}
                                </button>
                                <button
                                  onClick={() => handleDecision(lead.id, assignment.providerId, "dispute")}
                                  disabled={processingId === `${lead.id}-${assignment.providerId}`}
                                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium rounded-lg disabled:opacity-50"
                                >
                                  Dispute
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Finding the best providers for your request...</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
