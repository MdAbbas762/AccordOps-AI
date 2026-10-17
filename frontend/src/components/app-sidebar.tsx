"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  ListChecks,
  TriangleAlert,
  CheckCircle2,
  ScrollText,
  Plug,
  X,
  FileCheck2,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Contracts", href: "/contracts", icon: FileText },
  { name: "Obligations", href: "/obligations", icon: ListChecks },
  { name: "Exceptions", href: "/exceptions", icon: TriangleAlert },
  { name: "Approvals", href: "/approvals", icon: CheckCircle2 },
  { name: "Audit Logs", href: "/audit", icon: ScrollText },
  { name: "Integrations", href: "/integrations", icon: Plug },
];

type AppSidebarProps = {
  organizationName: string;
  mobile?: boolean;
  onClose?: () => void;
};

export default function AppSidebar({
  organizationName,
  mobile = false,
  onClose,
}: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-dvh w-full flex-col border-r border-slate-800 bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-200">
            <FileCheck2 size={18} />
          </div>

          <div className="min-w-0">
            <div className="truncate text-lg font-semibold tracking-tight text-white">
              AccordOps AI
            </div>

            <div className="truncate text-xs text-slate-400">
              Contract Intelligence & Control
            </div>
          </div>
        </div>

        {mobile ? (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="ml-3 rounded-lg p-2 text-slate-400 transition hover:bg-slate-900 hover:text-white"
          >
            <X size={20} />
          </button>
        ) : null}
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <Icon size={18} className="shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 px-5 py-4">
        <div className="text-xs text-slate-500">
          Organization
        </div>

        <div
          className="mt-1 truncate text-sm font-medium text-slate-200"
          title={organizationName}
        >
          {organizationName}
        </div>
      </div>
    </aside>
  );
}
