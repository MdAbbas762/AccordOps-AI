import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  FileSearch,
  Radar,
  ShieldCheck,
  Sparkles,
  TimerReset,
  TriangleAlert,
} from "lucide-react";
import AccordOpsMark from "@/components/accordops-mark";

const highlights = [
  "Obligations stay traceable",
  "Evidence stays connected",
  "Human review before action",
  "Exceptions keep their context",
];

const flow = [
  {
    number: "01",
    title: "Understand the contract",
    text: "Turn dense contract language into clear obligations while keeping the original clause beside every obligation.",
  },
  {
    number: "02",
    title: "Verify what matters",
    text: "Review the obligations that should become active controls before they affect day-to-day operations.",
  },
  {
    number: "03",
    title: "Watch real evidence",
    text: "Compare operational evidence with approved commitments and surface potential variances early.",
  },
  {
    number: "04",
    title: "Resolve with control",
    text: "Route corrective work through approval and keep the decision history attached to the obligation.",
  },
];

export default function HomePage() {
  return (
    <main className="landing-shell min-h-dvh overflow-x-clip text-white">
      <div className="landing-orb landing-orb-a" />
      <div className="landing-orb landing-orb-b" />
      <div className="landing-orb landing-orb-c" />
      <div className="landing-particles" aria-hidden="true" />

      <header className="sticky top-0 z-50 border-b border-white/[.06] bg-[#050812]/72 backdrop-blur-2xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-200 shadow-[0_0_30px_rgba(34,211,238,.10)]">
              <AccordOpsMark className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="truncate font-semibold tracking-tight text-white">AccordOps AI</div>
              <div className="hidden truncate text-xs text-slate-400 sm:block">Contract operations intelligence</div>
            </div>
          </Link>

          <nav className="landing-nav-pill hidden items-center gap-1 rounded-full border border-white/[.08] bg-white/[.04] p-1 text-sm text-slate-400 shadow-[0_14px_50px_rgba(0,0,0,.22)] md:flex">
            <a href="#product" className="rounded-full px-4 py-2 transition hover:bg-white/[.06] hover:text-white">Overview</a>
            <a href="#workflow" className="rounded-full px-4 py-2 transition hover:bg-white/[.06] hover:text-white">How it works</a>
            <a href="#teams" className="rounded-full px-4 py-2 transition hover:bg-white/[.06] hover:text-white">Teams</a>
          </nav>

          <Link
            href="/login"
            className="focus-ring landing-primary-button inline-flex shrink-0 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-950"
          >
            Sign in
          </Link>
        </div>
      </header>

      <section id="product" className="relative z-10 mx-auto grid w-full max-w-7xl gap-12 px-5 pb-24 pt-8 sm:px-8 sm:pt-9 lg:grid-cols-[1.03fr_.97fr] lg:items-start lg:px-10 lg:pb-32 lg:pt-10">
        <div className="landing-rise max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[.07] px-3 py-1.5 text-xs font-semibold tracking-wide text-cyan-100 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,.9)]" />
            Contract commitments, kept visible
          </div>

          <h1 className="max-w-4xl text-5xl font-semibold leading-[.98] tracking-[-0.055em] text-white sm:text-6xl lg:text-[4.7rem] xl:text-[5.15rem]">
            Contract commitments,
            <span className="mt-2 block bg-gradient-to-r from-cyan-200 via-violet-300 to-orange-300 bg-clip-text text-transparent">
              under control.
            </span>
          </h1>

          <p className="mt-7 max-w-2xl text-base leading-7 text-slate-300/85 sm:text-lg">
            AccordOps turns signed contracts into verified operational obligations, watches the evidence behind them, and surfaces the decisions that need attention before a commitment slips.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="focus-ring landing-primary-button inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-slate-950"
            >
              Open workspace <ArrowRight size={16} />
            </Link>
            <a
              href="#workflow"
              className="focus-ring inline-flex items-center justify-center rounded-xl border border-white/12 bg-white/[.035] px-5 py-3 text-sm font-medium text-slate-100 backdrop-blur transition hover:border-violet-300/30 hover:bg-white/[.07]"
            >
              See how it works
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
            <span>Legal & contract ops</span>
            <span className="hidden h-1 w-1 rounded-full bg-slate-700 sm:block" />
            <span>Service delivery</span>
            <span className="hidden h-1 w-1 rounded-full bg-slate-700 sm:block" />
            <span>Risk & finance</span>
          </div>
        </div>

        <div className="landing-rise-delayed relative lg:min-h-[590px]">
          <div className="landing-visual-glow absolute inset-[12%] rounded-full blur-3xl" />
          <div className="hero-grid absolute inset-0 rounded-[2.2rem] opacity-45" />

          <div className="relative mx-auto w-full rounded-[2.25rem] border border-white/10 bg-[#0a1020]/76 shadow-[0_45px_110px_rgba(0,0,0,.55)] backdrop-blur-xl lg:absolute lg:left-[5%] lg:top-[7%] lg:h-[88%] lg:w-[90%]">
            <div className="flex items-center justify-between border-b border-white/[.08] px-5 py-4 sm:px-6">
              <div>
                <div className="text-sm font-semibold text-white">Live control posture</div>
                <div className="mt-1 text-xs text-slate-500">What needs attention right now</div>
              </div>
              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[.06] px-2.5 py-1 text-[11px] text-emerald-200">
                Monitoring active
              </span>
            </div>

            <div className="relative p-5 sm:p-6">
              <div className="absolute left-[2.05rem] top-8 h-[calc(100%-4rem)] w-px bg-gradient-to-b from-cyan-300/60 via-violet-300/35 to-orange-300/35" />

              <div className="relative space-y-5">
                <div className="landing-float flex gap-4">
                  <div className="z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-300/30 bg-[#08101d] text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,.12)]">
                    <FileCheck2 size={16} />
                  </div>
                  <div className="min-w-0 flex-1 rounded-2xl border border-white/[.08] bg-white/[.035] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-medium text-cyan-200">Priority 1 incident acknowledgement</div>
                        <div className="mt-1 text-sm text-slate-300">Required within 30 minutes</div>
                      </div>
                      <span className="rounded-full border border-amber-300/20 bg-amber-300/[.06] px-2.5 py-1 text-[11px] text-amber-200">Review</span>
                    </div>
                  </div>
                </div>

                <div className="landing-float-delayed flex gap-4">
                  <div className="z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-violet-300/30 bg-[#08101d] text-violet-200">
                    <Radar size={16} />
                  </div>
                  <div className="min-w-0 flex-1 rounded-2xl border border-violet-300/10 bg-violet-300/[.04] p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[.16em] text-violet-200/80">Evidence check</div>
                    <div className="mt-2 text-sm font-medium text-white">Acknowledged after 78 minutes</div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-amber-200/90">
                      <TriangleAlert size={14} /> Outside the contractual threshold
                    </div>
                  </div>
                </div>

                <div className="landing-float flex gap-4">
                  <div className="z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-orange-300/30 bg-[#08101d] text-orange-200">
                    <ShieldCheck size={16} />
                  </div>
                  <div className="min-w-0 flex-1 rounded-2xl border border-orange-300/10 bg-orange-300/[.035] p-4">
                    <div className="text-sm font-medium text-white">Corrective action requires approval</div>
                    <div className="mt-1 text-xs leading-5 text-slate-400">The exception is visible, explained, and held until a reviewer decides.</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/[.07] bg-black/15 p-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500"><CheckCircle2 size={14} className="text-emerald-300" /> Service availability</div>
                  <div className="mt-3 text-lg font-semibold">On track</div>
                </div>
                <div className="rounded-2xl border border-white/[.07] bg-black/15 p-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500"><TimerReset size={14} className="text-cyan-300" /> Renewal notice</div>
                  <div className="mt-3 text-lg font-semibold">43 days</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-highlight-band relative z-10 overflow-hidden border-y border-white/[.08]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,.10),transparent_55%),linear-gradient(90deg,rgba(34,211,238,.035),rgba(249,115,22,.035))]" />
        <div className="landing-marquee relative py-7">
          <div className="landing-marquee-track">
            {[...highlights, ...highlights].map((item, index) => (
              <div key={`${item}-${index}`} className="landing-marquee-item">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,.75)]" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="relative z-10 mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="grid gap-8 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-300">From contract to action</div>
            <h2 className="mt-4 max-w-md text-4xl font-semibold leading-tight tracking-[-.035em] sm:text-5xl">
              A control loop your team can actually follow.
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-7 text-slate-400 lg:justify-self-end">
            AccordOps keeps the obligation, evidence, exception, decision, and outcome connected—so people do not have to reconstruct the story across documents and tools.
          </p>
        </div>

        <div className="relative mt-14">
          <div className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-cyan-300/0 via-cyan-300/35 to-violet-300/0 lg:block" />
          <div className="grid gap-8 lg:grid-cols-4">
            {flow.map((step) => (
              <article key={step.number} className="relative">
                <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-cyan-300/25 bg-[#09111e] text-xs font-semibold text-cyan-200 shadow-[0_0_28px_rgba(34,211,238,.08)]">
                  {step.number}
                </div>
                <h3 className="mt-5 text-xl font-semibold text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-500">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="teams" className="relative z-10 overflow-hidden border-y border-white/[.07] bg-[#090d18]/65">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(139,92,246,.10),transparent_28rem),radial-gradient(circle_at_85%_70%,rgba(249,115,22,.07),transparent_25rem)]" />
        <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[.92fr_1.08fr] lg:px-10 lg:py-28">
          <div>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-300/15 bg-violet-300/[.07] text-violet-200">
              <Sparkles size={20} />
            </div>
            <h2 className="mt-6 max-w-xl text-4xl font-semibold leading-tight tracking-[-.035em] sm:text-5xl">
              Built for the people accountable when a promise becomes operational.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-400">
              Contract teams verify what matters. Service delivery sees what is drifting. Risk and finance follow the decisions and outcomes without reopening the contract every time.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="group rounded-3xl border border-cyan-300/10 bg-cyan-300/[.035] p-6 transition duration-300 hover:-translate-y-1 hover:border-cyan-300/25">
              <FileSearch size={20} className="text-cyan-300" />
              <h3 className="mt-5 text-xl font-semibold text-white">Evidence stays attached</h3>
              <p className="mt-3 text-sm leading-7 text-slate-400">Every control keeps the contract language that supports it close enough to verify in seconds.</p>
            </div>
            <div className="group rounded-3xl border border-orange-300/10 bg-orange-300/[.025] p-6 transition duration-300 hover:-translate-y-1 hover:border-orange-300/25 sm:translate-y-8">
              <Radar size={20} className="text-orange-300" />
              <h3 className="mt-5 text-xl font-semibold text-white">Exceptions surface early</h3>
              <p className="mt-3 text-sm leading-7 text-slate-400">Evidence is checked against approved commitments so variance appears before it gets buried in operations.</p>
            </div>
            <div className="group rounded-3xl border border-violet-300/10 bg-violet-300/[.035] p-6 transition duration-300 hover:-translate-y-1 hover:border-violet-300/25 sm:col-span-2 sm:mt-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <ShieldCheck size={20} className="text-violet-300" />
                  <h3 className="mt-4 text-xl font-semibold text-white">Action stays governed</h3>
                  <p className="mt-2 max-w-xl text-sm leading-7 text-slate-400">High-impact corrective work waits for an explicit human decision, then the outcome becomes part of the same control history.</p>
                </div>
                <div className="shrink-0 rounded-2xl border border-white/[.08] bg-black/20 px-5 py-4 text-center">
                  <div className="text-2xl font-semibold text-white">1 loop</div>
                  <div className="mt-1 text-xs text-slate-500">clause → outcome</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="relative overflow-hidden rounded-[2.25rem] border border-white/[.10] bg-gradient-to-br from-cyan-300/[.11] via-violet-500/[.08] to-orange-300/[.08] px-6 py-12 sm:px-10 lg:px-14 lg:py-14">
          <div className="landing-orb landing-cta-orb" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-200">Bring obligations into the operating rhythm</div>
              <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">See what is promised, what is drifting, and what needs a decision—in one workspace.</h2>
            </div>
            <Link href="/login" className="focus-ring landing-primary-button inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-slate-950">
              Sign in <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/[.06]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-5 py-8 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <span>AccordOps AI · Contract operations intelligence</span>
          <span>Obligations → evidence → decisions → outcomes</span>
        </div>
      </footer>
    </main>
  );
}
