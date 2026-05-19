"use client";

import { Suspense } from "react";
import ServiceBookingPage from "./ServiceBookingPage";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>}>
      <ServiceBookingPage />
    </Suspense>
  );
}
