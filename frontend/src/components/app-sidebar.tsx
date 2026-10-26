"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  ListChecks,
  LogOut,
  ScrollText,
  TriangleAlert,
  X,
} from "lucide-react";
import AccordOpsMark from "@/components/accordops-mark";

const navigation = [
  { name: "Control Center", href: "/dashboard", icon: LayoutDashboard },
  { name: "Contracts", href: "/contracts", icon: FileText },
  { name: "Obligations", href: "/obligations", icon: ListChecks },
  { name: "Exceptions", href: "/exceptions", icon: TriangleAlert },
  { name: "Approvals", href: "/approvals", icon: CheckCircle2 },
  { name: "Audit Trail", href: "/audit", icon: ScrollText },
  { name: "Operations Status", href: "/automation", icon: Activity },
];

type Props = {
  organizationName: string;
  fullName: string;
  email: string;
  role: string;
  mobile?: boolean;
  onClose?: () => void;
};

const formatRole = (role: string) =>
  role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export default function AppSidebar({
  organizationName,
  fullName,
  email,
  role,
  mobile = false,
  onClose,
}: Props) {
  const pathname = usePathname();
  const initial =
    fullName.trim().charAt(0).toUpperCase() ||
    email.trim().charAt(0).toUpperCase() ||
    "A";

  return (
    <aside className="flex h-dvh w-full flex-col border-r border-slate-800/80 bg-[#060b14]/94 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-5">
        <Link
          href="/dashboard"
          onClick={onClose}
          className="flex min-w-0 items-center gap-3"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300 shadow-[0_0_28px_rgba(34,211,238,.08)]">
            <AccordOpsMark className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold tracking-tight">
              AccordOps AI
            </div>
            <div className="truncate text-xs text-slate-500">
              Contract Operations Intelligence
            </div>
          </div>
        </Link>
        {mobile ? (
          <button
            aria-label="Close navigation"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-900 hover:text-white"
          >
            <X size={19} />
          </button>
        ) : null}
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-5">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
          Workspace
        </div>
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-cyan-400/10 text-cyan-100 ring-1 ring-inset ring-cyan-400/10"
                  : "text-slate-400 hover:bg-slate-900/80 hover:text-slate-100"
              }`}
            >
              <Icon size={18} className="shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800/80 p-3">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/35 p-3">
          {organizationName ? (
            <div className="mb-3 truncate border-b border-slate-800/70 pb-2.5 text-[10px] font-semibold uppercase tracking-[.14em] text-slate-600">
              {organizationName}
            </div>
          ) : null}
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-300/15 bg-gradient-to-br from-cyan-300/10 to-violet-400/10 text-sm font-semibold text-slate-100">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-slate-200">
                {fullName || email}
              </div>
              <div className="truncate text-xs text-slate-500">
                {formatRole(role)}
              </div>
            </div>
            <form action="/auth/signout" method="post" className="shrink-0">
              <button
                type="submit"
                title="Sign out"
                aria-label="Sign out"
                className="rounded-xl border border-slate-800 p-2 text-slate-500 transition hover:border-red-500/25 hover:bg-red-500/5 hover:text-red-300"
              >
                <LogOut size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </aside>
  );
}
