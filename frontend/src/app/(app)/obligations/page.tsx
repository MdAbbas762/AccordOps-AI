"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Loader2, Search, ShieldCheck, X } from "lucide-react";
import { apiFetch, getApiError } from "@/lib/api";

type Obligation = {
  id:string; contract_title:string; obligation_type:string; title:string; description:string;
  responsible_party:string|null; owner_team:string|null; status:string; risk_level:string;
  ai_confidence:number|null; source_clause:string|null; source_page:number|null; rule_config:Record<string,unknown>;
};

const riskClass:Record<string,string>={
  low:"border-emerald-400/20 bg-emerald-400/5 text-emerald-300",
  medium:"border-amber-400/20 bg-amber-400/5 text-amber-300",
  high:"border-orange-400/20 bg-orange-400/5 text-orange-300",
  critical:"border-red-400/20 bg-red-400/5 text-red-300",
};

export default function ObligationsPage(){
 const[items,setItems]=useState<Obligation[]>([]);const[loading,setLoading]=useState(true);const[error,setError]=useState("");const[working,setWorking]=useState<string|null>(null);const[filter,setFilter]=useState("all");const[query,setQuery]=useState("");
 const fetchItems=useCallback(async()=>{const r=await apiFetch("/api/v1/obligations");if(!r.ok)throw new Error(await getApiError(r));return await r.json() as Obligation[]},[]);
 const refresh=useCallback(async()=>setItems(await fetchItems()),[fetchItems]);
 useEffect(()=>{let cancelled=false;void fetchItems().then(v=>{if(!cancelled){setItems(v);setError("")}}).catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:"Could not load obligations.")}).finally(()=>{if(!cancelled)setLoading(false)});return()=>{cancelled=true}},[fetchItems]);
 const visible=useMemo(()=>items.filter(item=>(filter==="all"||item.status===filter)&&`${item.title} ${item.contract_title} ${item.description}`.toLowerCase().includes(query.toLowerCase())),[items,filter,query]);
 async function decide(id:string,decision:"approved"|"rejected"){setWorking(id);setError("");try{const r=await apiFetch(`/api/v1/obligations/${id}/review`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({decision})});if(!r.ok)throw new Error(await getApiError(r));await refresh()}catch(e){setError(e instanceof Error?e.message:"Review failed.")}finally{setWorking(null)}}
 return <div className="mx-auto w-full max-w-7xl space-y-6">
   <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-300">Human verification</div><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Contract obligations</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Review extracted obligations beside their source evidence. Approved obligations become active monitoring controls.</p></div><div className="flex gap-2 text-xs text-slate-500"><span>{items.filter(x=>x.status==="candidate").length} awaiting review</span><span>·</span><span>{items.filter(x=>x.status==="approved").length} approved</span></div></div>
   <div className="panel grid gap-3 rounded-2xl p-3 sm:grid-cols-[1fr_auto]"><label className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search obligations or contracts" className="focus-ring w-full rounded-xl border border-slate-800 bg-slate-950/70 py-2.5 pl-9 pr-3 text-sm placeholder:text-slate-600"/></label><div className="flex flex-wrap gap-2">{["all","candidate","approved","rejected"].map(value=><button key={value} onClick={()=>setFilter(value)} className={`rounded-xl px-3 py-2 text-xs font-medium capitalize ${filter===value?"bg-cyan-300 text-slate-950":"border border-slate-800 text-slate-400 hover:text-white"}`}>{value}</button>)}</div></div>
   {error?<div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">{error}</div>:null}
   {loading?<div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="animate-spin" size={18}/>Loading contract obligations…</div>:visible.length===0?<div className="panel rounded-2xl px-6 py-16 text-center text-sm text-slate-500">No obligations match this view. Upload a contract and extract its obligations from Contracts.</div>:<div className="grid gap-4 lg:grid-cols-2">{visible.map(item=>{
     const confidence=item.ai_confidence!==null?Math.round(item.ai_confidence*100):null;
     return <article key={item.id} className="panel flex min-w-0 flex-col rounded-2xl p-5 sm:p-6">
       <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="text-[11px] font-semibold uppercase tracking-[.14em] text-slate-500">{item.contract_title} · {item.obligation_type}</div><h2 className="mt-2 text-lg font-semibold leading-7 text-white">{item.title}</h2></div><div className="flex gap-2"><span className={`rounded-full border px-2.5 py-1 text-xs capitalize ${riskClass[item.risk_level]??riskClass.medium}`}>{item.risk_level}</span><span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs capitalize text-slate-300">{item.status}</span></div></div>
       <div className="mt-5"><div className="text-[11px] font-semibold uppercase tracking-[.16em] text-cyan-300/80">Normalized obligation</div><p className="mt-2 text-sm leading-6 text-slate-200">{item.description}</p></div>
       <details className="group mt-5 rounded-xl border border-slate-800 bg-slate-950/50"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-slate-300"><span>Contract evidence{item.source_page?` · page ${item.source_page}`:""}</span><ChevronDown size={16} className="transition group-open:rotate-180"/></summary><div className="border-t border-slate-800 px-4 py-3 text-sm leading-6 text-slate-400">{item.source_clause||"No source clause stored."}</div></details>
       <div className="mt-auto pt-5"><div className="flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-end sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-2 text-xs"><span className="font-medium text-slate-300">Extraction confidence</span><span className="tabular-nums text-slate-500">{confidence!==null?`${confidence}%`:"Not scored"}</span></div>{confidence!==null?<div className="mt-2 h-1.5 w-40 max-w-full overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-300" style={{width:`${confidence}%`}}/></div>:null}</div>
       {item.status==="candidate"?<div className="flex gap-2 sm:justify-end"><button disabled={working===item.id} onClick={()=>void decide(item.id,"rejected")} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"><span className="inline-flex items-center gap-1.5"><X size={14}/>Reject</span></button><button disabled={working===item.id} onClick={()=>void decide(item.id,"approved")} className="rounded-xl bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-50"><span className="inline-flex items-center gap-1.5">{working===item.id?<Loader2 size={14} className="animate-spin"/>:<Check size={14}/>}Approve</span></button></div>:item.status==="approved"?<span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300"><ShieldCheck size={14}/>Monitoring enabled</span>:null}</div></div>
     </article>})}</div>}
 </div>
}
