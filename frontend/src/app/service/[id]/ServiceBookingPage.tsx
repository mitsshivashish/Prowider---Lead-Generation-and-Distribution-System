"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { createLead } from "@/lib/api";
import { getServiceDetail } from "@/lib/services";

interface FormData {
  customerName: string;
  email: string;
  phone: string;
  location: string;
  budget: string;
  serviceDate: string;
  notes: string;
  issueType: string;
  urgency: string;
  workType: string;
  propertyType: string;
  frequency: string;
}

const inputClass =
  "w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent";

export default function ServiceBookingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const serviceId = Number(params.id);
  const category = searchParams.get("category");
  const service = getServiceDetail(serviceId);

  const [form, setForm] = useState<FormData>({
    customerName: "",
    email: "",
    phone: "",
    location: "",
    budget: "",
    serviceDate: "",
    notes: "",
    issueType: "",
    urgency: "",
    workType: "",
    propertyType: "",
    frequency: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!service) router.replace("/");
  }, [service, router]);

  if (!service) return null;

  const displayName = category || service.name;

  const setField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const next: Partial<Record<keyof FormData, string>> = {};
    if (!form.customerName.trim()) next.customerName = "Name is required";
    if (!form.phone.trim()) next.phone = "Phone is required";
    if (!form.location.trim()) next.location = "Location is required";
    if (!form.serviceDate) next.serviceDate = "Preferred date is required";
    if (service.type === "Plumbing" && !form.issueType) next.issueType = "Please select an issue type";
    if (service.type === "Electrical" && !form.workType) next.workType = "Please select work type";
    if (service.type === "Cleaning" && !form.propertyType) next.propertyType = "Please select property type";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildDescription = () => {
    const parts = [`Service requested: ${displayName}`];
    if (form.notes) parts.push(`Notes: ${form.notes}`);
    if (service.type === "Plumbing") {
      parts.push(`Issue: ${form.issueType}`, `Urgency: ${form.urgency || "standard"}`);
    }
    if (service.type === "Electrical") parts.push(`Work type: ${form.workType}`);
    if (service.type === "Cleaning") {
      parts.push(`Property: ${form.propertyType}`, `Frequency: ${form.frequency || "one-time"}`);
    }
    return parts.join("\n");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log("handleSubmit triggered"); // DEBUGGING
    e.preventDefault();

    const isValid = validate();
    console.log("Form validation result:", isValid, errors); // DEBUGGING
    if (!isValid) return;

    setSubmitting(true);
    setSubmitError("");
    try {
      const leadPayload = {
        name: form.customerName.trim(),
        email: form.email.trim() || undefined,
        phoneNumber: form.phone.replace(/[\s\-()]/g, ""), // Strip spaces/dashes to match backend Regex
        city: form.location.trim(),
        serviceId,
        description: buildDescription(),
        budget: form.budget.trim() ? Number(form.budget.replace(/[^0-9.]/g, "")) : undefined, // Format string to clean Number
        serviceDate: form.serviceDate ? new Date(form.serviceDate).toISOString() : undefined, // Convert YYYY-MM-DD to ISO Datetime
      };
      console.log("Submitting lead with payload:", leadPayload); // DEBUGGING

      const result = await createLead(leadPayload);
      sessionStorage.setItem(
        "prowider_booking",
        JSON.stringify({
          lead: result.lead,
          serviceName: displayName,
          allocatedCount: result.allocatedProviders?.length ?? 0,
        })
      );
      router.push("/booking-confirmation");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to submit booking";
      console.error("Submission failed:", errorMessage, err); // DEBUGGING
      setSubmitError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-8">
              <p className="text-blue-100 text-sm font-medium mb-1">Home Services</p>
              <h1 className="text-3xl font-bold">{displayName}</h1>
              <p className="mt-3 text-blue-100 leading-relaxed">{service.description}</p>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {submitError && (
                <div className="p-4 rounded-lg bg-red-50 text-red-700 text-sm">{submitError}</div>
              )}

              <h2 className="text-xl font-bold text-gray-900">Book Your Service</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input className={inputClass} value={form.customerName} onChange={(e) => setField("customerName", e.target.value)} placeholder="John Doe" />
                  {errors.customerName && <p className="text-red-500 text-sm mt-1">{errors.customerName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" className={inputClass} value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="john@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input type="tel" className={inputClass} value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="+1 555 000 0000" />
                  {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location / City *</label>
                  <input className={inputClass} value={form.location} onChange={(e) => setField("location", e.target.value)} placeholder="Your city" />
                  {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget (optional)</label>
                  <input className={inputClass} value={form.budget} onChange={(e) => setField("budget", e.target.value)} placeholder="e.g. $200–500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date *</label>
                  <input type="date" className={inputClass} value={form.serviceDate} onChange={(e) => setField("serviceDate", e.target.value)} />
                  {errors.serviceDate && <p className="text-red-500 text-sm mt-1">{errors.serviceDate}</p>}
                </div>
              </div>

              {service.type === "Plumbing" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-xl">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plumbing Issue *</label>
                    <select className={inputClass} value={form.issueType} onChange={(e) => setField("issueType", e.target.value)}>
                      <option value="">Select issue type</option>
                      <option value="leak_repair">Leak Repair</option>
                      <option value="installation">New Installation</option>
                      <option value="water_heater">Water Heater</option>
                      <option value="other">Other</option>
                    </select>
                    {errors.issueType && <p className="text-red-500 text-sm mt-1">{errors.issueType}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
                    <select className={inputClass} value={form.urgency} onChange={(e) => setField("urgency", e.target.value)}>
                      <option value="standard">Standard</option>
                      <option value="urgent">Urgent (same day)</option>
                      <option value="emergency">Emergency (24h)</option>
                    </select>
                  </div>
                </div>
              )}

              {service.type === "Electrical" && (
                <div className="p-4 bg-yellow-50 rounded-xl">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Electrical Work Type *</label>
                  <select className={inputClass} value={form.workType} onChange={(e) => setField("workType", e.target.value)}>
                    <option value="">Select work type</option>
                    <option value="repair">Electrical Repair</option>
                    <option value="installation">New Installation</option>
                    <option value="panel_upgrade">Panel Upgrade</option>
                    <option value="inspection">Safety Inspection</option>
                  </select>
                  {errors.workType && <p className="text-red-500 text-sm mt-1">{errors.workType}</p>}
                </div>
              )}

              {service.type === "Cleaning" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-green-50 rounded-xl">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Property Type *</label>
                    <select className={inputClass} value={form.propertyType} onChange={(e) => setField("propertyType", e.target.value)}>
                      <option value="">Select property</option>
                      <option value="apartment">Apartment</option>
                      <option value="house">House</option>
                      <option value="office">Office</option>
                    </select>
                    {errors.propertyType && <p className="text-red-500 text-sm mt-1">{errors.propertyType}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                    <select className={inputClass} value={form.frequency} onChange={(e) => setField("frequency", e.target.value)}>
                      <option value="one-time">One-time Deep Clean</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                <textarea className={inputClass} rows={3} value={form.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="Describe your requirements..." />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                {submitting ? "Submitting..." : `Book Professional ${displayName} Service`}
              </button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
