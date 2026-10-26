"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ListChecks,
  Loader2,
} from "lucide-react";
import { apiFetch, getApiError } from "@/lib/api";

type DashboardData = {
  active_contracts: number;
  approved_obligations: number;
  candidate_obligations: number;
  open_exceptions: number;
  pending_approvals: number;
  recent_exceptions: Array<{
    id: string;
    title: string;
    summary?: string | null;
    severity: string;
    status: string;
    detected_at: string;
  }>;
  recent_activity: Array<{
    id: number;
    actor_type: string;
    action: string;
    entity_type: string;
    created_at: string;
  }>;
};

const actionLabels: Record<string, string> = {
  "contract.uploaded": "Contract uploaded",
  "obligations.extracted": "Obligations extracted",
  "obligation.approved": "Obligation approved",
  "obligation.rejected": "Obligation rejected",
  "monitoring.check_passed": "Evidence check passed",
  "exception.investigated": "Exception reviewed",
  "approval.approved": "Corrective action approved",
  "approval.rejected": "Corrective action rejected",
  "automation.action_succeeded": "Corrective action completed",
  "automation.action_failed": "Corrective action failed",
};

const readableAction = (value: string) =>
  actionLabels[value] ??
  value
    .replaceAll(".", " ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const actorLabel = (actor: string) => {
  if (actor === "user") return "Team";
  if (actor === "ai") return "Analysis";
  return "System";
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    void apiFetch("/api/v1/dashboard")
      .then(async (response) => {
        if (!response.ok) throw new Error(await getApiError(response));
        return (await response.json()) as DashboardData;
      })
      .then((value) => {
        if (!cancelled) setData(value);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load the control center.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-80 items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="animate-spin" size={18} /> Loading workspace…
      </div>
    );
  }

  const stats = [
    {
      label: "Active contracts",
      value: data?.active_contracts ?? 0,
      detail: "Contracts with approved obligations",
      icon: FileText,
    },
    {
      label: "Monitored obligations",
      value: data?.approved_obligations ?? 0,
      detail: `${data?.candidate_obligations ?? 0} awaiting review`,
      icon: ListChecks,
    },
    {
      label: "Open exceptions",
      value: data?.open_exceptions ?? 0,
      detail: "Variances requiring attention",
      icon: AlertTriangle,
    },
    {
      label: "Pending approvals",
      value: data?.pending_approvals ?? 0,
      detail: "Decisions required before action",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-300">
          Workspace overview
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Control Center
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          See which contractual commitments are active, what needs review, and where attention is required.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, detail }) => (
          <article key={label} className="panel rounded-2xl p-5">
            <div className="flex items-start justify-between">
              <span className="text-sm text-slate-400">{label}</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800/70 text-cyan-300">
                <Icon size={17} />
              </div>
            </div>
            <div className="mt-4 text-3xl font-semibold tracking-tight">{value}</div>
            <div className="mt-2 text-xs leading-5 text-slate-500">{detail}</div>
          </article>
        ))}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[1.05fr_.95fr]">
        <section className="panel self-start overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div>
              <h2 className="font-semibold">Recent exceptions</h2>
              <p className="mt-1 text-xs text-slate-500">Latest detected variances and their current status</p>
            </div>
            <AlertTriangle size={17} className="text-amber-300" />
          </div>

          {data?.recent_exceptions.length ? (
            <div className="divide-y divide-slate-800">
              {data.recent_exceptions.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium leading-6 text-slate-200">{item.title}</div>
                    {item.summary ? (
                      <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.summary}</div>
                    ) : null}
                    <div className="mt-2 text-xs text-slate-600">
                      {new Date(item.detected_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:max-w-40 sm:justify-end">
                    <span className="rounded-full border border-red-400/20 bg-red-400/5 px-2.5 py-1 text-[11px] capitalize text-red-300">
                      {item.severity}
                    </span>
                    <span className="rounded-full border border-slate-700 px-2.5 py-1 text-[11px] capitalize text-slate-400">
                      {item.status.replaceAll("_", " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center text-sm text-slate-500">
              No exceptions are open right now.
            </div>
          )}
        </section>

        <section className="panel self-start overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div>
              <h2 className="font-semibold">Recent activity</h2>
              <p className="mt-1 text-xs text-slate-500">
                Latest changes across contracts, obligations, and approvals
              </p>
            </div>
            <Activity size={17} className="text-cyan-300" />
          </div>

          {data?.recent_activity.length ? (
            <div className="divide-y divide-slate-800">
              {data.recent_activity.map((item) => (
                <div key={item.id} className="flex gap-3 px-5 py-4">
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan-300" />
                  <div>
                    <div className="text-sm text-slate-300">{readableAction(item.action)}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {actorLabel(item.actor_type)} · {new Date(item.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center text-sm text-slate-500">No activity yet.</div>
          )}
        </section>
      </div>
    </div>
  );
}
