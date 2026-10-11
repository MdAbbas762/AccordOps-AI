import { Bell, Search } from "lucide-react";

export default function Topbar() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/80 px-6 backdrop-blur">
      <div>
        <div className="text-sm font-medium text-slate-200">
          Operational Control Center
        </div>
        <div className="text-xs text-slate-500">
          Monitor obligations, exceptions and approvals
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="rounded-lg border border-slate-800 p-2 text-slate-400 transition hover:bg-slate-900 hover:text-white">
          <Search size={17} />
        </button>

        <button className="rounded-lg border border-slate-800 p-2 text-slate-400 transition hover:bg-slate-900 hover:text-white">
          <Bell size={17} />
        </button>

        <div className="ml-2 flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-white">
          A
        </div>
      </div>
    </header>
  );
}
