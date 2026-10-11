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

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-950">
      <div className="border-b border-slate-800 px-6 py-6">
        <div className="text-xl font-semibold tracking-tight text-white">
          AccordOps AI
        </div>
        <div className="mt-1 text-xs text-slate-400">
          Contract Intelligence & Control
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-5">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 px-5 py-4">
        <div className="text-xs text-slate-500">Organization</div>
        <div className="mt-1 text-sm font-medium text-slate-200">
          AccordOps Demo Organization
        </div>
      </div>
    </aside>
  );
}
