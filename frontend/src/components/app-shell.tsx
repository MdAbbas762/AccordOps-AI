"use client";

import { useState } from "react";

import AppSidebar from "@/components/app-sidebar";
import Topbar from "@/components/topbar";

type AppShellProps = {
  children: React.ReactNode;
  organizationName: string;
  fullName: string;
  email: string;
  role: string;
};

export default function AppShell({
  children,
  organizationName,
  fullName,
  email,
  role,
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-dvh overflow-x-hidden bg-slate-950 text-white">
      <div className="fixed inset-y-0 left-0 hidden w-64 lg:block">
        <AppSidebar organizationName={organizationName} />
      </div>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation overlay"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <div className="relative h-full w-[84vw] max-w-xs shadow-2xl">
            <AppSidebar
              organizationName={organizationName}
              mobile
              onClose={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="min-w-0 lg:pl-64">
        <Topbar
          fullName={fullName}
          email={email}
          role={role}
          onMenuOpen={() => setMobileMenuOpen(true)}
        />

        <main className="min-w-0 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
