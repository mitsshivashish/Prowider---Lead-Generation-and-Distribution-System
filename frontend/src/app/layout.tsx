import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { ProviderAuthProvider } from "@/lib/provider-auth";

export const metadata: Metadata = {
  title: "ProWider — Find Trusted Local Professionals",
  description: "Book plumbing, electrical, cleaning, and home services with ProWider",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 antialiased">
        <AuthProvider>
          <ProviderAuthProvider>{children}</ProviderAuthProvider>
        </AuthProvider>
      </body>
    </html>
  );
}