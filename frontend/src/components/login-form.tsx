"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import AccordOpsMark from "@/components/accordops-mark";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const reason = searchParams.get("reason");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full">
      <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-200">
        <ArrowLeft size={15} /> Back to product overview
      </Link>
      <form onSubmit={handleSubmit} className="panel w-full rounded-3xl p-5 sm:p-7">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
            <AccordOpsMark className="h-6 w-6" />
          </div>
          <div>
            <div className="text-lg font-semibold">AccordOps AI</div>
            <div className="text-xs text-slate-500">Secure organization workspace</div>
          </div>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Sign in to your workspace</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">Review contract controls, monitor operational evidence and approve remediation.</p>

        {reason === "session_expired" ? (
          <div className="mt-5 flex gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3.5 py-3 text-sm text-amber-200">
            <ShieldCheck size={17} className="mt-0.5 shrink-0" /> Your session expired securely. Sign in again to continue.
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          <label className="block text-sm text-slate-300">
            <span className="mb-1.5 block font-medium">Email</span>
            <input type="email" autoComplete="email" required value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" className="focus-ring w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-3 text-white placeholder:text-slate-600" />
          </label>
          <label className="block text-sm text-slate-300">
            <span className="mb-1.5 block font-medium">Password</span>
            <input type="password" autoComplete="current-password" required value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Enter your password" className="focus-ring w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-3 text-white placeholder:text-slate-600" />
          </label>
        </div>
        {error ? <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-3.5 py-3 text-sm text-red-300">{error}</div> : null}
        <button type="submit" disabled={loading} className="focus-ring mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60">
          {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in...</> : "Sign in"}
        </button>
        <div className="mt-5 border-t border-slate-800 pt-4 text-center text-xs text-slate-500">Organization-managed access · No public signup</div>
      </form>
    </div>
  );
}
