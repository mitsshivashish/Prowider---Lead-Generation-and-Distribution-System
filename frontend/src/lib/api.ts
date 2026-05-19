/**
 * Refactored to use NEXT_PUBLIC_API_URL instead of hardcoding localhost
 * Resolves "Hardcoded API URL" Medium Priority Issue
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

// Helper function to construct full API URLs (e.g., for EventSource/SSE)
export function apiUrl(endpoint: string = "") {
  // Automatically remove duplicate '/api' if passed in the endpoint by mistake
  const cleanEndpoint = endpoint.startsWith("/api") ? endpoint.slice(4) : endpoint;
  return `${API_URL}${cleanEndpoint}`;
}

export interface Lead {
  id: number;
  name: string;
  email?: string | null;
  phoneNumber: string;
  city: string;
  serviceId: number;
  service: {
    id: number;
    name: string;
  };
  description: string;
  budget?: string | null;
  serviceDate?: string | null;
  status: string;
  createdAt: string;
  assignedProviders?: ProviderAssignment[];
}

export interface ProviderProfile {
  id: number;
  name: string;
  email: string;
  monthlyQuota: number;
  leadsCount: number;
  remainingQuota: number;
}

export interface ProviderLead extends Lead {
  assignedAt: string;
  assignmentStatus: string;
  completionNote?: string | null;
  completionRequestedAt?: string | null;
  completedAt?: string | null;
}

export interface ProviderSummary extends ProviderProfile {
  leadsToday: number;
}

export interface ProviderAssignment {
  id: number;
  providerId: number;
  leadId: number;
  assignedAt: string;
  status: string;
  completionNote?: string | null;
  completionRequestedAt?: string | null;
  completedAt?: string | null;
  provider: {
    id: number;
    name: string;
    email: string;
    monthlyQuota?: number;
  };
}

// Custom fetch wrapper to handle consistent API error responses (from Week 2)
export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    credentials: "include", // Send cookies with all API requests
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Accommodates the standardized `{ message: "...", details: {} }` error format
    let errorMessage = data.message || data.error || "An API error occurred";
    
    // Extract specific Zod field errors if they exist
    if (data.details && data.details.fieldErrors) {
      const fields = Object.values(data.details.fieldErrors).flat();
      if (fields.length > 0) errorMessage = `${errorMessage}: ${fields.join(', ')}`;
    }
    
    throw new Error(errorMessage);
  }

  return data;
}

export async function getLeads(page?: number | null, limit?: number | null) {
  // Explicitly check for null/undefined/invalid to ensure a valid number is always passed.
  const safePage = (page && page > 0) ? page : 1;
  const safeLimit = (limit && limit > 0) ? limit : 20;

  // Handles the new standardized pagination response from Week 2: { data, meta }
  const response = await fetchAPI(`/leads?page=${safePage}&limit=${safeLimit}`);
  return {
    leads: response.data || [],
    pagination: response.meta || { page: safePage, limit: safeLimit, total: response.data?.length || 0, totalPages: Math.ceil((response.data?.length || 0) / safeLimit) },
  };
}

export async function getProviders() {
  // Handled the new optimized providers endpoint from Week 2 (using _count aggregations)
  return fetchAPI("/providers");
}

export async function getAdminProviderDetails(id: number) {
  return fetchAPI(`/providers/${id}`);
}

export async function loginAdmin(email: string, password: string) {
  return fetchAPI("/auth/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function loginProvider(email: string, password: string) {
  return fetchAPI("/auth/provider/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function updateLeadStatus(id: number, status: string) {
  return fetchAPI(`/leads/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function getCustomerLeads(email: string) {
  return fetchAPI(`/leads/customer?email=${encodeURIComponent(email)}`);
}

export async function decideCompletionRequest(
  leadId: number,
  providerId: number,
  action: "approve" | "reject"
) {
  return fetchAPI(`/leads/${leadId}/providers/${providerId}/completion`, {
    method: "PATCH",
    body: JSON.stringify({ action }),
  });
}

export async function submitCustomerCompletionDecision(
  leadId: number,
  providerId: number,
  action: "confirm" | "dispute"
) {
  return fetchAPI(`/leads/${leadId}/providers/${providerId}/customer-confirmation`, {
    method: "PATCH",
    body: JSON.stringify({ action }),
  });
}

export async function createLead(data: any) {
  return fetchAPI("/leads", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function callWebhook(data: {
  providerId: number;
  idempotencyKey: string;
  action: "reset_quota";
}) {
  return fetchAPI("/webhook", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteLead(id: number) {
  return fetchAPI(`/leads/${id}`, {
    method: "DELETE",
  });
}

export async function getProviderProfile() {
  // Corresponds to GET /api/auth/provider/me on the backend
  return fetchAPI("/auth/provider/me");
}

export async function getProviderDetails(id?: number) {
  if (typeof id === "number") {
    return getAdminProviderDetails(id);
  }

  return getProviderProfile();
}

export async function getMyProviderLeads() {
  // Corresponds to GET /api/auth/provider/me/leads on the backend
  return fetchAPI("/auth/provider/me/leads");
}

export async function requestLeadCompletion(leadId: number, note?: string) {
  return fetchAPI(`/auth/provider/me/leads/${leadId}/request-completion`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}
