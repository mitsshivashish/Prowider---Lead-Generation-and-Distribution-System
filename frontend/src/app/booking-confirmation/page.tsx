"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

interface BookingData {
  lead: {
    id: number;
    name: string;
    phoneNumber: string;
    city: string;
    serviceDate?: string | null;
    email?: string | null;
  };
  serviceName: string;
  allocatedCount: number;
}

export default function BookingConfirmationPage() {
  const router = useRouter();
  const [booking, setBooking] = useState<BookingData | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("prowider_booking");
    if (!raw) {
      router.replace("/");
      return;
    }
    setBooking(JSON.parse(raw));
    sessionStorage.removeItem("prowider_booking");
  }, [router]);

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading confirmation...
      </div>
    );
  }

  const { lead, serviceName, allocatedCount } = booking;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 py-16 px-4">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
          <p className="text-gray-600 mb-8">
            Your {serviceName} request has been submitted. We&apos;ve matched you with {allocatedCount} provider
            {allocatedCount !== 1 ? "s" : ""}.
          </p>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-left space-y-3 mb-8">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Reference</span>
              <span className="font-medium text-gray-900">#{lead.id}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Name</span>
              <span className="font-medium text-gray-900">{lead.name}</span>
            </div>
            {lead.email && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Email</span>
                <span className="font-medium text-gray-900">{lead.email}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Phone</span>
              <span className="font-medium text-gray-900">{lead.phoneNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Location</span>
              <span className="font-medium text-gray-900">{lead.city}</span>
            </div>
            {lead.serviceDate && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Preferred Date</span>
                <span className="font-medium text-gray-900">{lead.serviceDate}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Service</span>
              <span className="font-medium text-gray-900">{serviceName}</span>
            </div>
          </div>

          <Link
            href="/"
            className="inline-block px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
