import { Suspense } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { Shell } from "@/components/Shell";
import { SessionProvider, ToastProvider } from "@/lib/hooks";

export const metadata: Metadata = { title: "LeadGuard CRM", description: "Unified business management platform" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <SessionProvider><ToastProvider><Suspense fallback={null}><Shell>{children}</Shell></Suspense></ToastProvider></SessionProvider>
      </body>
    </html>
  );
}
