const stats = [
  {
    label: "Active Contracts",
    value: "0",
    description: "Monitored agreements",
  },
  {
    label: "Active Obligations",
    value: "0",
    description: "Approved operational rules",
  },
  {
    label: "Open Exceptions",
    value: "0",
    description: "Require investigation",
  },
  {
    label: "Pending Approvals",
    value: "0",
    description: "Awaiting human decision",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Real-time overview of contract obligations and operational risk.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-5"
          >
            <div className="text-sm text-slate-400">{stat.label}</div>
            <div className="mt-3 text-3xl font-semibold text-white">
              {stat.value}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {stat.description}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-800 bg-slate-900/40">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="font-medium text-white">Recent Exceptions</h2>
          </div>
          <div className="flex min-h-48 items-center justify-center px-5 py-8 text-sm text-slate-500">
            No exceptions detected yet.
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/40">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="font-medium text-white">Upcoming Obligations</h2>
          </div>
          <div className="flex min-h-48 items-center justify-center px-5 py-8 text-sm text-slate-500">
            No upcoming deadlines yet.
          </div>
        </section>
      </div>
    </div>
  );
}
