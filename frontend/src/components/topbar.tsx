"use client";

import {
  Bell,
  LogOut,
  Menu,
  Search,
} from "lucide-react";

type TopbarProps = {
  fullName: string;
  email: string;
  role: string;
  onMenuOpen: () => void;
};

function formatRole(role: string) {
  return role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function Topbar({
  fullName,
  email,
  role,
  onMenuOpen,
}: TopbarProps) {
  const initial =
    fullName.trim().charAt(0).toUpperCase() ||
    email.trim().charAt(0).toUpperCase() ||
    "A";

  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/95 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          aria-label="Open navigation"
          onClick={onMenuOpen}
          className="shrink-0 rounded-lg border border-slate-800 p-2 text-slate-400 transition hover:bg-slate-900 hover:text-white lg:hidden"
        >
          <Menu size={19} />
        </button>

        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-slate-200">
            Operational Control Center
          </div>

          <div className="hidden truncate text-xs text-slate-500 sm:block">
            Monitor obligations, exceptions and approvals
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label="Search"
          className="hidden rounded-lg border border-slate-800 p-2 text-slate-400 transition hover:bg-slate-900 hover:text-white md:inline-flex"
        >
          <Search size={17} />
        </button>

        <button
          type="button"
          aria-label="Notifications"
          className="hidden rounded-lg border border-slate-800 p-2 text-slate-400 transition hover:bg-slate-900 hover:text-white md:inline-flex"
        >
          <Bell size={17} />
        </button>

        <div className="hidden max-w-36 text-right sm:block">
          <div className="truncate text-sm font-medium text-slate-200">
            {fullName}
          </div>

          <div className="text-xs text-slate-500">
            {formatRole(role)}
          </div>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-white">
          {initial}
        </div>

        <form action="/auth/signout" method="post">
          <button
            type="submit"
            title="Sign out"
            aria-label="Sign out"
            className="rounded-lg border border-slate-800 p-2 text-slate-400 transition hover:border-red-900 hover:bg-red-950/30 hover:text-red-300"
          >
            <LogOut size={17} />
          </button>
        </form>
      </div>
    </header>
  );
}
