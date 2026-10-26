"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { apiFetch, getApiError } from "@/lib/api";

type Approval = {
  id: string;
  exception_title: string;
  requested_action: string;
  risk_level: string;
  status: string;
  decision_note: string | null;
  investigation_finding: string | null;
  investigation_confidence: number | null;
  created_at: string;
  decided_at: string | null;
};

export default function ApprovalsPage() {
  const [items, setItems] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchItems = useCallback(async () => {
    const response = await apiFetch("/api/v1/approvals");
    if (!response.ok) throw new Error(await getApiError(response));
    return (await response.json()) as Approval[];
  }, []);

  const refresh = useCallback(async () => setItems(await fetchItems()), [fetchItems]);

  useEffect(() => {
    let cancelled = false;
    void fetchItems()
      .then((value) => {
        if (!cancelled) {
          setItems(value);
          setError("");
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load approvals.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchItems]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 8000);
    return () => window.clearTimeout(timer);
  }, [message]);

  async function decide(id: string, decision: "approved" | "rejected") {
    setWorking(id);
    setError("");
    setMessage("");
    try {
      const response = await apiFetch(`/api/v1/approvals/${id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          note: decision === "approved" ? "Approved by reviewer." : "Rejected after review.",
        }),
      });
      if (!response.ok) throw new Error(await getApiError(response));
      setMessage(
        decision === "approved"
          ? "Approved. Corrective work has been queued."
          : "The proposed corrective action was rejected.",
      );
      await refresh();
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "Decision failed.");
    } finally {
      setWorking(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-300">
          Decision queue
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Approvals</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Review recommended corrective actions before they are carried out. Every decision remains attached to the exception that triggered it.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-emerald-300">
          {message}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="animate-spin" size={17} /> Loading approval queue…
        </div>
      ) : items.length === 0 ? (
        <div className="panel rounded-2xl px-6 py-14 text-center text-sm text-slate-500">
          No approval requests are waiting.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <article key={item.id} className="panel rounded-2xl p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[.14em] text-slate-500">
                    <ShieldCheck size={14} /> {item.risk_level} priority
                  </div>
                  <h2 className="mt-2 text-lg font-semibold leading-7">{item.exception_title}</h2>
                </div>
                <span
                  className={`self-start rounded-full border px-2.5 py-1 text-xs capitalize ${
                    item.status === "approved"
                      ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-300"
                      : item.status === "rejected"
                        ? "border-red-400/20 bg-red-400/5 text-red-300"
                        : "border-amber-400/20 bg-amber-400/5 text-amber-300"
                  }`}
                >
                  {item.status.replaceAll("_", " ")}
                </span>
              </div>

              {item.investigation_finding ? (
                <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/55 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[.16em] text-cyan-300/80">
                    Investigation finding
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{item.investigation_finding}</p>
                  {item.investigation_confidence !== null ? (
                    <div className="mt-2 text-xs text-slate-500">
                      Finding confidence: {Math.round(item.investigation_confidence * 100)}%
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-5">
                <div className="text-[11px] font-semibold uppercase tracking-[.16em] text-slate-500">
                  Recommended corrective action
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-200">{item.requested_action}</p>
              </div>

              <div className="mt-5 flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock3 size={13} /> {new Date(item.created_at).toLocaleString()}
                </div>
                {item.status === "pending" ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      disabled={working === item.id}
                      onClick={() => void decide(item.id, "rejected")}
                      className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                    >
                      <span className="inline-flex items-center justify-center gap-2">
                        <XCircle size={16} /> Reject
                      </span>
                    </button>
                    <button
                      disabled={working === item.id}
                      onClick={() => void decide(item.id, "approved")}
                      className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-50"
                    >
                      <span className="inline-flex items-center justify-center gap-2">
                        {working === item.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={16} />
                        )}
                        Approve & execute
                      </span>
                    </button>
                  </div>
                ) : item.decision_note ? (
                  <div className="text-xs text-slate-500">Decision note: {item.decision_note}</div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
