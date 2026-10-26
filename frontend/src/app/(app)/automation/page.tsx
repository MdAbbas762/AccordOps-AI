"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Clock3,
  Gauge,
  Loader2,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { apiFetch, getApiError } from "@/lib/api";

type WorkflowStatus = {
  name: string;
  purpose: string;
  configured: boolean;
};

type AutomationStatus = {
  n8n: {
    configured: boolean;
    reachable: boolean;
    health_error: string | null;
    workflows: WorkflowStatus[];
    last_action: {
      status?: string;
      executed_at?: string | null;
      created_at?: string | null;
      response_payload?: Record<string, unknown> | null;
    } | null;
    last_event: {
      source_system?: string;
      event_type?: string;
      occurred_at?: string | null;
      payload?: Record<string, unknown> | null;
    } | null;
  };
  ai: {
    mode: string;
    gemini_configured: boolean;
    model: string;
  };
  pulse: {
    approved_controls: number;
    candidate_controls: number;
    open_exceptions: number;
    pending_approvals: number;
    coverage_percent: number;
    headline: string;
    focus: string;
    next_action: string;
  };
};

function displayDate(value?: string | null) {
  if (!value) return "No activity recorded yet";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

const eventLabels: Record<string, string> = {
  "obligation.evaluated": "Evidence check completed",
  "monitoring.check_passed": "Evidence check passed",
  "exception.investigated": "Variance sent for review",
};

function titleFromEvent(value?: string) {
  if (!value) return "No monitoring event yet";
  return (
    eventLabels[value] ??
    value
      .replaceAll(".", " ")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export default function AutomationPage() {
  const [data, setData] = useState<AutomationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStatus = useCallback(async (): Promise<AutomationStatus> => {
    const response = await apiFetch("/api/v1/automation/status");
    if (!response.ok) throw new Error(await getApiError(response));
    return (await response.json()) as AutomationStatus;
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchStatus());
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Could not refresh operations status.",
      );
    } finally {
      setLoading(false);
    }
  }, [fetchStatus]);

  useEffect(() => {
    let cancelled = false;

    void fetchStatus()
      .then((status) => {
        if (!cancelled) setData(status);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load operations status.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchStatus]);

  const workflowReady = useMemo(
    () => Boolean(data?.n8n.configured && data?.n8n.reachable),
    [data],
  );

  const analysisReady = useMemo(
    () => Boolean(data && (data.ai.gemini_configured || data.ai.mode === "local_rules")),
    [data],
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-300">
            Operations
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Operations Status
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            A current view of monitoring coverage, open exceptions, pending decisions, and recent corrective activity.
          </p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={loading}
          className="focus-ring inline-flex self-start items-center justify-center gap-2 rounded-xl border border-slate-700 px-3.5 py-2 text-sm text-slate-300 hover:bg-slate-900 disabled:opacity-60 lg:self-auto"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {loading && !data ? (
        <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="animate-spin" size={17} /> Building the current control brief…
        </div>
      ) : data ? (
        <>
          <section className="relative overflow-hidden rounded-3xl border border-cyan-300/15 bg-gradient-to-br from-cyan-300/[.08] via-[#0b1221] to-violet-400/[.08] p-5 sm:p-7">
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 left-1/4 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-cyan-200">
                  <Activity size={14} /> Current operations brief
                </div>
                <h2 className="mt-4 max-w-3xl text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
                  {data.pulse.headline}
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                  {data.pulse.focus}
                </p>
                <div className="mt-5 rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-slate-300">
                  <span className="font-medium text-white">Next best action:</span>{" "}
                  {data.pulse.next_action}
                </div>
              </div>

              <div className="flex items-center justify-center lg:pl-4">
                <div
                  className="relative flex h-40 w-40 items-center justify-center rounded-full"
                  style={{
                    background: `conic-gradient(#67e8f9 ${data.pulse.coverage_percent * 3.6}deg, rgba(51,65,85,.42) 0deg)`,
                  }}
                >
                  <div className="absolute inset-[9px] rounded-full bg-[#08101d]" />
                  <div className="relative text-center">
                    <div className="text-3xl font-semibold tabular-nums text-white">
                      {data.pulse.coverage_percent}%
                    </div>
                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-[.14em] text-slate-500">
                      control coverage
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Active controls", data.pulse.approved_controls, ShieldCheck, "text-emerald-300"],
              ["Awaiting review", data.pulse.candidate_controls, Gauge, "text-cyan-300"],
              ["Open exceptions", data.pulse.open_exceptions, TriangleAlert, "text-amber-300"],
              ["Pending decisions", data.pulse.pending_approvals, CheckCircle2, "text-violet-300"],
            ].map(([label, value, Icon, tone]) => {
              const MetricIcon = Icon as typeof Activity;
              return (
                <article key={String(label)} className="panel rounded-2xl p-5">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 ${tone}`}>
                    <MetricIcon size={17} />
                  </div>
                  <div className="mt-4 text-3xl font-semibold tabular-nums text-white">{String(value)}</div>
                  <div className="mt-1 text-xs text-slate-500">{String(label)}</div>
                </article>
              );
            })}
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
            <section className="panel rounded-2xl p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-100">Latest control activity</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Live records from evidence checks and approved corrective work
                  </p>
                </div>
                <Clock3 size={17} className="text-cyan-300" />
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[.16em] text-slate-600">
                    Latest evidence check
                  </div>
                  <div className="mt-2 text-sm font-medium text-slate-200">
                    {titleFromEvent(data.n8n.last_event?.event_type)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {displayDate(data.n8n.last_event?.occurred_at)}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[.16em] text-slate-600">
                    Latest corrective action
                  </div>
                  <div className="mt-2 text-sm font-medium capitalize text-slate-200">
                    {data.n8n.last_action?.status?.replaceAll("_", " ") ?? "No action yet"}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {displayDate(data.n8n.last_action?.executed_at ?? data.n8n.last_action?.created_at)}
                  </div>
                </div>
              </div>
            </section>

            <section className="panel rounded-2xl p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold text-slate-100">Control loop readiness</h2>
                <Activity size={17} className="text-violet-300" />
              </div>
              <div className="mt-5 space-y-3">
                {[
                  ["Evidence monitoring", workflowReady],
                  ["Approved remediation", workflowReady],
                  ["Control analysis", analysisReady],
                ].map(([label, ready]) => (
                  <div key={String(label)} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
                    <span className="text-sm text-slate-300">{String(label)}</span>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${ready ? "text-emerald-300" : "text-amber-300"}`}>
                      {ready ? <CheckCircle2 size={14} /> : <TriangleAlert size={14} />}
                      {ready ? "Ready" : "Needs attention"}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                href="/exceptions"
                className="focus-ring mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
              >
                <PlayCircle size={15} /> Run evidence check
              </Link>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
