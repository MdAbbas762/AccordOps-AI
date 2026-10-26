"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  FileText,
  Filter,
  Loader2,
  ScrollText,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { apiFetch, getApiError } from "@/lib/api";

type Audit = {
  id: number;
  actor_type: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  title: string;
  summary: string;
  category: string;
  status: string | null;
  created_at: string;
};

const icons: Record<string, typeof ScrollText> = {
  contracts: FileText,
  ai: Activity,
  approvals: ShieldCheck,
  automation: CheckCircle2,
  monitoring: TriangleAlert,
  system: ScrollText,
};

const categoryLabels: Record<string, string> = {
  all: "All",
  contracts: "Contracts",
  ai: "Analysis",
  approvals: "Approvals",
  automation: "Actions",
  monitoring: "Monitoring",
  system: "System",
};

const actorLabel = (actor: string) => {
  if (actor === "user") return "Team";
  if (actor === "ai") return "Analysis";
  return "System";
};

export default function AuditPage() {
  const [items, setItems] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;

    void apiFetch("/api/v1/audit?limit=200")
      .then(async (response) => {
        if (!response.ok) throw new Error(await getApiError(response));
        return (await response.json()) as Audit[];
      })
      .then((value) => {
        if (!cancelled) setItems(value);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load the audit trail.",
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

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(items.map((item) => item.category)))],
    [items],
  );

  const visible =
    filter === "all" ? items : items.filter((item) => item.category === filter);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-300">
            Accountability
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Audit Trail
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            A chronological record of contract changes, reviews, exceptions, approvals, and completed actions.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 text-xs text-slate-500">
          <Filter size={14} />
          {items.length} {items.length === 1 ? "recorded event" : "recorded events"}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setFilter(category)}
            className={`rounded-xl px-3 py-2 text-xs font-medium transition ${
              filter === category
                ? "bg-cyan-300 text-slate-950"
                : "border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white"
            }`}
          >
            {categoryLabels[category] ?? category}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="animate-spin" size={17} /> Loading history…
        </div>
      ) : visible.length === 0 ? (
        <div className="panel rounded-2xl px-6 py-14 text-center text-sm text-slate-500">
          No events match this view.
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((item) => {
            const Icon = icons[item.category] ?? ScrollText;
            return (
              <article key={item.id} className="panel rounded-2xl p-4 sm:p-5">
                <div className="flex gap-3 sm:gap-4">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800/80 text-cyan-300">
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h2 className="font-semibold text-slate-100">{item.title}</h2>
                        <div className="mt-1 text-xs text-slate-500">
                          {actorLabel(item.actor_type)} · {categoryLabels[item.category] ?? item.entity_type}
                        </div>
                      </div>
                      <div className="shrink-0 text-xs text-slate-500">
                        {new Date(item.created_at).toLocaleString()}
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">{item.summary}</p>
                    {item.status ? (
                      <div className="mt-3 inline-flex rounded-full border border-slate-700 px-2.5 py-1 text-[11px] capitalize text-slate-400">
                        {item.status.replaceAll("_", " ")}
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
