"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import AppSidebar from "@/components/app-sidebar";
import AccordOpsMark from "@/components/accordops-mark";

type Props = {
  children: React.ReactNode;
  organizationName: string;
  fullName: string;
  email: string;
  role: string;
};

const pageTitles: Record<string, string> = {
  "/dashboard": "Control Center",
  "/contracts": "Contracts",
  "/obligations": "Obligations",
  "/exceptions": "Exceptions",
  "/approvals": "Approvals",
  "/audit": "Audit Trail",
  "/automation": "Operations Status",
};

export default function AppShell({
  children,
  organizationName,
  fullName,
  email,
  role,
}: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const sidebarProps = { organizationName, fullName, email, role };

  return (
    <div className="workspace-shell min-h-dvh overflow-x-hidden text-white">
      <div className="fixed inset-y-0 left-0 z-40 hidden w-64 xl:block">
        <AppSidebar {...sidebarProps} />
      </div>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            aria-label="Close navigation overlay"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
          />
          <div className="relative h-full w-[88vw] max-w-xs shadow-2xl">
            <AppSidebar
              {...sidebarProps}
              mobile
              onClose={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="relative min-w-0 xl:pl-64">
        <header className="sticky top-0 z-30 flex min-h-14 items-center gap-3 border-b border-slate-800/70 bg-[#050914]/84 px-4 backdrop-blur-xl xl:hidden">
          <button
            aria-label="Open navigation"
            onClick={() => setMobileMenuOpen(true)}
            className="rounded-xl border border-slate-800 p-2 text-slate-400 transition hover:bg-slate-900 hover:text-white"
          >
            <Menu size={18} />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
            <AccordOpsMark className="h-5 w-5" />
          </div>
          <div className="min-w-0 truncate text-sm font-semibold text-slate-200">
            {pageTitles[pathname] ?? "AccordOps AI"}
          </div>
        </header>

        <main className="relative min-w-0 px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10 xl:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}
