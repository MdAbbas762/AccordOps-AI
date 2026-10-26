"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  BrainCircuit,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import { apiFetch, getApiError } from "@/lib/api";

type Contract = {
  id: string;
  title: string;
  customer_name: string;
  contract_type: string;
  status: string;
  effective_date: string | null;
  expiration_date: string | null;
  auto_renews: boolean;
  renewal_notice_days: number | null;
  file_name: string | null;
  mime_type: string | null;
  page_count: number | null;
  created_at: string;
  obligation_count: number;
};

const cap = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const fmt = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "—";

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [autoRenews, setAutoRenews] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchContracts = useCallback(async (): Promise<Contract[]> => {
    const response = await apiFetch("/api/v1/contracts");
    if (!response.ok) throw new Error(await getApiError(response));
    return (await response.json()) as Contract[];
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setContracts(await fetchContracts());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Contracts could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [fetchContracts]);

  useEffect(() => {
    let cancelled = false;

    void fetchContracts()
      .then((value) => {
        if (!cancelled) {
          setContracts(value);
          setError("");
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Contracts could not be loaded.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchContracts]);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(""), 8000);
    return () => window.clearTimeout(timer);
  }, [success]);

  const counts = useMemo(
    () => ({
      total: contracts.length,
      review: contracts.filter((contract) => contract.status === "under_review").length,
      active: contracts.filter((contract) => contract.status === "active").length,
    }),
    [contracts],
  );

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("auto_renews", autoRenews ? "true" : "false");
    if (!autoRenews) formData.delete("renewal_notice_days");

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const response = await apiFetch("/api/v1/contracts/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error(await getApiError(response));
      const created = await response.json();
      setSuccess(
        `${created.title} uploaded securely and is ready for obligation extraction.`,
      );
      form.reset();
      setAutoRenews(false);
      setShowUpload(false);
      await load();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function extract(item: Contract) {
    setExtracting(item.id);
    setError("");
    setSuccess("");

    try {
      const response = await apiFetch(
        `/api/v1/contracts/${item.id}/extract-obligations`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error(await getApiError(response));
      const result = await response.json();
      setSuccess(
        `${result.created} obligations are ready for review.`,
      );
      await load();
    } catch (extractError) {
      setError(
        extractError instanceof Error
          ? extractError.message
          : "Obligation extraction failed.",
      );
    } finally {
      setExtracting(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-300">
            Contract register
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Contracts
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Upload signed contracts, keep their source text private, and turn monitorable clauses into reviewable obligations.
          </p>
        </div>
        <button
          onClick={() => setShowUpload((value) => !value)}
          className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3.5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15 lg:w-auto"
        >
          {showUpload ? <X size={16} /> : <Plus size={16} />}
          {showUpload ? "Close upload" : "Upload contract"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Total contracts", counts.total],
          ["Awaiting review", counts.review],
          ["Active contracts", counts.active],
        ].map(([label, value]) => (
          <div key={String(label)} className="panel rounded-2xl p-4">
            <div className="text-xs text-slate-500">{label}</div>
            <div className="mt-2 text-2xl font-semibold">{value}</div>
          </div>
        ))}
      </div>

      {showUpload ? (
        <section className="panel rounded-2xl p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
              <Upload size={18} />
            </div>
            <div>
              <h2 className="font-semibold">Upload signed contract</h2>
              <p className="mt-1 text-xs text-slate-500">
                PDF or DOCX · maximum 10 MB · originals remain private
              </p>
            </div>
          </div>

          <form onSubmit={upload} className="mt-6 space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-slate-300">
                <span className="mb-1.5 block font-medium">Customer</span>
                <input
                  name="customer_name"
                  required
                  minLength={2}
                  placeholder="Customer organization"
                  className="focus-ring w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-3 placeholder:text-slate-600"
                />
              </label>
              <label className="text-sm text-slate-300">
                <span className="mb-1.5 block font-medium">Contract title</span>
                <input
                  name="title"
                  required
                  minLength={2}
                  placeholder="Managed Services Agreement"
                  className="focus-ring w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-3 placeholder:text-slate-600"
                />
              </label>
              <label className="text-sm text-slate-300">
                <span className="mb-1.5 block font-medium">Contract type</span>
                <select
                  name="contract_type"
                  defaultValue="msa"
                  className="focus-ring w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-3"
                >
                  <option value="msa">Master Services Agreement</option>
                  <option value="sow">Statement of Work</option>
                  <option value="amendment">Amendment</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="text-sm text-slate-300">
                <span className="mb-1.5 block font-medium">Contract file</span>
                <input
                  name="file"
                  type="file"
                  required
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="focus-ring block w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-slate-200"
                />
              </label>
              <label className="text-sm text-slate-300">
                <span className="mb-1.5 block font-medium">Effective date</span>
                <input
                  name="effective_date"
                  type="date"
                  className="focus-ring w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-3"
                />
              </label>
              <label className="text-sm text-slate-300">
                <span className="mb-1.5 block font-medium">Expiration date</span>
                <input
                  name="expiration_date"
                  type="date"
                  className="focus-ring w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-3"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/45 px-4 py-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={autoRenews}
                  onChange={(event) => setAutoRenews(event.target.checked)}
                  className="h-4 w-4"
                />
                Automatically renews
              </label>
              {autoRenews ? (
                <label className="text-sm text-slate-300">
                  <span className="mb-1.5 block font-medium">Renewal notice days</span>
                  <input
                    name="renewal_notice_days"
                    type="number"
                    min={0}
                    placeholder="60"
                    className="focus-ring w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-3"
                  />
                </label>
              ) : null}
            </div>

            <div className="flex justify-end">
              <button
                disabled={uploading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50 sm:w-auto"
              >
                {uploading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Upload size={16} />
                )}
                Upload securely
              </button>
            </div>
          </form>
        </section>
      ) : null}

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

      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="animate-spin" size={17} /> Loading contracts…
        </div>
      ) : contracts.length === 0 ? (
        <div className="panel rounded-2xl px-6 py-14 text-center text-sm text-slate-500">
          No contracts yet. Upload the first contract to start the review process.
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((item) => (
            <article key={item.id} className="panel overflow-hidden rounded-2xl">
              <div className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800/80 text-cyan-300">
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-slate-500">
                      {item.customer_name} · {cap(item.contract_type)}
                    </div>
                    <h2 className="mt-1 text-base font-semibold text-slate-100">
                      {item.title}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>{item.file_name ?? "No file"}</span>
                      <span>{item.page_count ? `${item.page_count} pages` : (item.file_name?.toLowerCase().endsWith(".docx") ? "DOCX" : item.file_name?.toLowerCase().endsWith(".pdf") ? "PDF" : "Document")}</span>
                      {item.effective_date || item.expiration_date ? (
                        <span>
                          {item.effective_date ? `Effective ${fmt(item.effective_date)}` : ""}
                          {item.effective_date && item.expiration_date ? " · " : ""}
                          {item.expiration_date ? `Ends ${fmt(item.expiration_date)}` : ""}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-800/80 bg-slate-950/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <span
                  className={`w-fit rounded-full border px-2.5 py-1 text-xs capitalize ${
                    item.status === "active"
                      ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-300"
                      : "border-amber-400/20 bg-amber-400/5 text-amber-300"
                  }`}
                >
                  {item.status.replaceAll("_", " ")}
                </span>
                {item.obligation_count > 0 ? (
                  <span className="inline-flex items-center gap-2 text-xs font-medium text-emerald-300">
                    <BrainCircuit size={14} />
                    {item.obligation_count} {item.obligation_count === 1 ? "obligation" : "obligations"} extracted
                  </span>
                ) : (
                  <button
                    disabled={extracting === item.id}
                    onClick={() => void extract(item)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-3.5 py-2.5 text-sm font-medium text-cyan-200 hover:bg-cyan-400/10 disabled:opacity-50 sm:w-auto"
                  >
                    {extracting === item.id ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <BrainCircuit size={15} />
                    )}
                    Extract obligations
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300"
        >
          <RefreshCw size={13} /> Refresh register
        </button>
      </div>
    </div>
  );
}
