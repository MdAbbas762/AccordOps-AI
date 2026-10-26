"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock3,
  Loader2,
  PlayCircle,
} from "lucide-react";
import { apiFetch, getApiError } from "@/lib/api";

type Obligation = {
  id: string;
  title: string;
  contract_title: string;
  status: string;
  rule_config: Record<string, unknown>;
};

type ExceptionItem = {
  id: string;
  contract_title: string | null;
  obligation_title: string;
  severity: string;
  status: string;
  title: string;
  summary: string | null;
  expected_value: Record<string, unknown>;
  observed_value: Record<string, unknown>;
  detected_at: string;
  investigation: {
    finding?: string;
    recommended_action?: string;
    confidence?: number;
    model_name?: string;
  } | null;
  approval_id: string | null;
};

type Data = { items: ExceptionItem[]; obligations: Obligation[] };

export default function ExceptionsPage() {
  const [items, setItems] = useState<ExceptionItem[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchData = useCallback(async (): Promise<Data> => {
    const [exceptionsResponse, obligationsResponse] = await Promise.all([
      apiFetch("/api/v1/exceptions"),
      apiFetch("/api/v1/obligations"),
    ]);
    if (!exceptionsResponse.ok) throw new Error(await getApiError(exceptionsResponse));
    if (!obligationsResponse.ok) throw new Error(await getApiError(obligationsResponse));
    const all = (await obligationsResponse.json()) as Obligation[];
    return {
      items: (await exceptionsResponse.json()) as ExceptionItem[],
      obligations: all.filter((item) => item.status === "approved"),
    };
  }, []);

  const refresh = useCallback(async () => {
    const data = await fetchData();
    setItems(data.items);
    setObligations(data.obligations);
  }, [fetchData]);

  useEffect(() => {
    let cancelled = false;
    void fetchData()
      .then((data) => {
        if (!cancelled) {
          setItems(data.items);
          setObligations(data.obligations);
          setError("");
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load monitoring data.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(""), 8000);
    return () => window.clearTimeout(timer);
  }, [success]);

  async function simulate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const formData = new FormData(formElement);

    setWorking(true);
    setError("");
    setSuccess("");

    try {
      const response = await apiFetch("/api/v1/automation/monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          obligation_id: formData.get("obligation_id"),
          observed_value: formData.get("observed_value"),
          evidence_note: formData.get("evidence_note") || null,
          source: "accordops_ui",
        }),
      });
      if (!response.ok) throw new Error(await getApiError(response));
      const result = await response.json();
      setSuccess(
        result.status === "compliant"
          ? "Evidence check completed. The approved obligation is currently within its expected threshold."
          : "Evidence check completed. A potential variance was sent for review.",
      );
      formElement.reset();
      await refresh();
    } catch (monitoringError) {
      setError(
        monitoringError instanceof Error
          ? monitoringError.message
          : "Monitoring check failed.",
      );
    } finally {
      setWorking(false);
    }
  }

  const openCount = useMemo(
    () => items.filter((item) => item.status !== "resolved" && item.status !== "dismissed").length,
    [items],
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-300">
            Evidence monitoring
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Exceptions & monitoring
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Compare operational evidence against approved obligations and route material variances for review.
          </p>
        </div>
        <div className="text-sm text-slate-500">
          {openCount} open · {items.length} total
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-emerald-300">
          {success}
        </div>
      ) : null}

      <section className="panel rounded-2xl p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
            <PlayCircle size={19} />
          </div>
          <div>
            <h2 className="font-semibold">Run an evidence check</h2>
            <p className="mt-1 text-sm text-slate-500">
              Submit the latest operational result for an approved obligation.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 flex min-h-32 items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="animate-spin" size={17} /> Loading approved obligations…
          </div>
        ) : obligations.length === 0 ? (
          <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-4 text-sm text-amber-200">
            No approved obligations are available yet. Approve an obligation first.
          </div>
        ) : (
          <form onSubmit={simulate} className="mt-6 space-y-4">
            <label className="block text-sm text-slate-300">
              <span className="mb-1.5 block font-medium">Approved obligation</span>
              <select
                name="obligation_id"
                required
                className="focus-ring w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-3 text-sm text-white"
              >
                <option value="">Choose an obligation to evaluate</option>
                {obligations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.contract_title} — {item.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <label className="min-w-0 text-sm text-slate-300">
                <span className="mb-1.5 block font-medium">Observed value / outcome</span>
                <textarea
                  name="observed_value"
                  required
                  rows={3}
                  placeholder="Describe the measured result or operational outcome"
                  className="focus-ring w-full min-w-0 resize-y rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-3 text-sm placeholder:text-slate-600"
                />
              </label>
              <label className="min-w-0 text-sm text-slate-300">
                <span className="mb-1.5 block font-medium">Evidence note</span>
                <textarea
                  name="evidence_note"
                  rows={3}
                  placeholder="Add a short source or context note (optional)"
                  className="focus-ring w-full min-w-0 resize-y rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-3 text-sm placeholder:text-slate-600"
                />
              </label>
            </div>
            <div className="flex justify-end">
              <button
                disabled={working}
                className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-50 sm:w-auto"
              >
                {working ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <PlayCircle size={16} />
                )}
                Run monitoring check
              </button>
            </div>
          </form>
        )}
      </section>

      {!loading && items.length === 0 ? (
        <div className="panel rounded-2xl px-6 py-12 text-center text-sm text-slate-500">
          No exceptions are open. Submit evidence above when a monitored obligation has a new operational result.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <article key={item.id} className="panel rounded-2xl p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="text-xs text-slate-500">
                    {item.contract_title ?? "Contract"} · {item.obligation_title}
                  </div>
                  <h2 className="mt-2 text-lg font-semibold leading-7">{item.title}</h2>
                  {item.summary ? (
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{item.summary}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <span className="rounded-full border border-red-400/20 bg-red-400/5 px-2.5 py-1 text-xs capitalize text-red-300">
                    {item.severity}
                  </span>
                  <span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs capitalize text-slate-300">
                    {item.status.replaceAll("_", " ")}
                  </span>
                </div>
              </div>

              {item.investigation ? (
                <div className="mt-5 rounded-xl border border-cyan-400/10 bg-cyan-400/[.035] p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-cyan-300">
                    <Bot size={15} /> Investigation
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-200">
                    {item.investigation.finding}
                  </p>
                  <div className="mt-3 text-sm text-slate-400">
                    <span className="font-medium text-slate-300">Recommended action:</span>{" "}
                    {item.investigation.recommended_action}
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 size={13} /> {new Date(item.detected_at).toLocaleString()}
                </span>
                {item.approval_id && item.status !== "resolved" ? (
                  <span className="inline-flex items-center gap-1.5 text-amber-300">
                    <AlertTriangle size={13} /> Approval requested
                  </span>
                ) : item.status === "resolved" ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-300">
                    <CheckCircle2 size={13} /> Resolved
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
