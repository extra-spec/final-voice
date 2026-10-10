"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cleanBiz, PERSONAS, type Vertical } from "@/lib/demo/personas";
import { fmtDuration, leadStatus, loadCalls, seedCalls, type CallRecord, type LeadStatus } from "@/lib/demo/store";

type Tab = "dashboard" | "calls" | "leads";

const STATUS: Record<LeadStatus, { label: string; cls: string }> = {
  NEW: { label: "New", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  CONTACTED: { label: "Contacted", cls: "bg-slate-50 text-slate-600 border-slate-200" },
  FOLLOW_UP: { label: "Callback requested", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  BOOKING_REQUESTED: { label: "Booking requested", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};
const Pill = ({ cls, children }: { cls: string; children: React.ReactNode }) => <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
const when = (t: number) => new Date(t).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [real, setReal] = useState<CallRecord[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [vertical, setVertical] = useState<Vertical>("realestate");
  const [biz, setBiz] = useState("");
  const [now] = useState(() => Date.now());

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const v: Vertical = q.get("v") === "plumbing" ? "plumbing" : "realestate";
    setVertical(v);
    const list = loadCalls(); setReal(list);
    setBiz(cleanBiz(q.get("biz") ?? list[0]?.biz, PERSONAS[v].defaultBiz));
    const c = q.get("call"); if (c && list.some((x) => x.id === c)) setOpen(c);
  }, []);

  // While a summary is still being written, re-read storage so it appears by itself.
  const pending = real.some((c) => c.analysis === undefined);
  useEffect(() => { if (!pending) return; const t = setInterval(() => setReal(loadCalls()), 1500); return () => clearInterval(t); }, [pending]);

  const all = useMemo(() => [...real, ...seedCalls(vertical, biz || PERSONAS[vertical].defaultBiz, now)].sort((a, b) => b.startedAt - a.startedAt), [real, vertical, biz, now]);
  const selected = all.find((c) => c.id === open) ?? null;
  const leads = all.filter((c) => c.analysis && (c.analysis.callerName || c.analysis.intent));
  const totalSecs = all.reduce((n, c) => n + c.durationSecs, 0);
  const actions = all.filter((c) => c.analysis?.outcome === "booking_requested" || c.analysis?.outcome === "callback_requested").length;

  const stat = (label: string, value: string, hint: string) => (
    <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm"><p className="text-xs text-black/50">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p><p className="mt-0.5 text-xs text-black/40">{hint}</p></div>
  );

  const callRow = (c: CallRecord) => {
    const st = c.analysis === undefined ? null : leadStatus(c.analysis);
    return (
      <tr key={c.id} onClick={() => setOpen(c.id)} className={`cursor-pointer border-t border-black/5 text-sm transition hover:bg-black/[.02] ${!c.sample ? "bg-emerald-50/40" : ""}`}>
        <td className="px-4 py-3"><span className="font-medium">{c.analysis?.callerName ?? (c.sample ? "Caller" : "You")}</span>{!c.sample && <span className="ml-2 rounded-full bg-[#1F5B4C] px-2 py-0.5 text-[10px] font-medium text-white">Your call</span>}<span className="block text-xs text-black/40">Inbound · {c.lang === "hi" ? "Hindi" : "English"}</span></td>
        <td className="hidden px-4 py-3 text-black/60 sm:table-cell">{when(c.startedAt)}</td>
        <td className="px-4 py-3 tabular-nums text-black/60">{fmtDuration(c.durationSecs)}</td>
        <td className="hidden max-w-[260px] truncate px-4 py-3 text-black/60 md:table-cell">{c.analysis === undefined ? "Writing summary…" : c.analysis?.summary ?? "Summary unavailable"}</td>
        <td className="px-4 py-3">{st ? <Pill cls={STATUS[st].cls}>{STATUS[st].label}</Pill> : <Pill cls="bg-amber-50 text-amber-700 border-amber-200">Summarising</Pill>}</td>
      </tr>
    );
  };
  const head = (cols: string[]) => <thead><tr className="text-left text-xs text-black/45">{cols.map((c, i) => <th key={c} className={`px-4 py-2.5 font-medium ${i === 1 ? "hidden sm:table-cell" : ""} ${i === 3 ? "hidden md:table-cell" : ""}`}>{c}</th>)}</tr></thead>;
  const card = "overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm";

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-black/10 bg-white md:min-h-screen md:w-56 md:border-b-0 md:border-r">
        <div className="flex items-center gap-2 px-5 py-4"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1F5B4C] text-xs font-bold text-white">S</span><span className="text-sm font-semibold tracking-tight">STRIKE.AI</span></div>
        <nav className="flex gap-1 px-3 pb-3 md:flex-col">
          {(["dashboard", "calls", "leads"] as Tab[]).map((t) => <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-3 py-2 text-left text-sm capitalize transition ${tab === t ? "bg-[#1F5B4C]/10 font-medium text-[#1F5B4C]" : "text-black/60 hover:bg-black/[.04]"}`}>{t}</button>)}
        </nav>
      </aside>

      <main className="flex-1 px-4 py-6 md:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h1 className="text-xl font-semibold capitalize tracking-tight">{tab}</h1><p className="text-sm text-black/50">{biz || PERSONAS[vertical].defaultBiz}</p></div>
            <div className="flex items-center gap-3"><span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-black/50">Demo dashboard · sample data + your call</span>
              <Link href={`/demo?v=${vertical}&biz=${encodeURIComponent(biz)}`} className="rounded-xl bg-[#1F5B4C] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#184a3e]">Call again</Link></div>
          </div>

          {tab === "dashboard" && <>
            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              {stat("Calls handled", String(all.length), "AI answered every one")}
              {stat("Talk time", fmtDuration(totalSecs), "no staff time used")}
              {stat("Leads captured", String(leads.length), "saved automatically")}
              {stat("Visits / callbacks", String(actions), "ready for your team")}
            </div>
            <h2 className="mb-2 mt-7 text-sm font-medium">Recent calls</h2>
            <div className={card}><table className="w-full">{head(["Caller", "Time", "Duration", "AI summary", "Status"])}<tbody>{all.slice(0, 5).map(callRow)}</tbody></table></div>
          </>}

          {tab === "calls" && <div className={`mt-5 ${card}`}><table className="w-full">{head(["Caller", "Time", "Duration", "AI summary", "Status"])}<tbody>{all.map(callRow)}</tbody></table></div>}

          {tab === "leads" && <div className={`mt-5 ${card}`}><div className="overflow-x-auto"><table className="w-full min-w-[560px]">
            <thead><tr className="text-left text-xs text-black/45">{["Name", "Interested in", "Details", "When", "Status"].map((c) => <th key={c} className="px-4 py-2.5 font-medium">{c}</th>)}</tr></thead>
            <tbody>{leads.map((c) => { const a = c.analysis!; return (
              <tr key={c.id} onClick={() => setOpen(c.id)} className="cursor-pointer border-t border-black/5 text-sm hover:bg-black/[.02]">
                <td className="px-4 py-3 font-medium">{a.callerName ?? "Not given"}{!c.sample && <span className="ml-2 rounded-full bg-[#1F5B4C] px-2 py-0.5 text-[10px] font-medium text-white">Your call</span>}</td>
                <td className="px-4 py-3 text-black/70">{a.intent ?? "-"}</td><td className="px-4 py-3 text-black/60">{a.requirement ?? "-"}</td>
                <td className="px-4 py-3 text-black/60">{a.preferredTime ?? "-"}</td>
                <td className="px-4 py-3"><Pill cls={STATUS[leadStatus(a)].cls}>{STATUS[leadStatus(a)].label}</Pill></td></tr>); })}</tbody></table></div></div>}

          <p className="mt-6 text-xs text-black/40">Sample rows are examples for the demo. Your own call is saved in this browser only. With the real phone line, caller numbers, recordings and calendar bookings appear here automatically.</p>
        </div>
      </main>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4" onClick={() => setOpen(null)}>
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div><h3 className="text-lg font-semibold tracking-tight">{selected.analysis?.callerName ?? (selected.sample ? "Caller" : "You")}</h3><p className="text-sm text-black/50">{when(selected.startedAt)} · {fmtDuration(selected.durationSecs)} · {selected.lang === "hi" ? "Hindi" : "English"}</p></div>
              <button onClick={() => setOpen(null)} className="rounded-lg px-2 py-1 text-black/40 hover:bg-black/[.05]" aria-label="Close">✕</button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {selected.analysis ? <Pill cls={STATUS[leadStatus(selected.analysis)].cls}>{STATUS[leadStatus(selected.analysis)].label}</Pill> : <Pill cls="bg-amber-50 text-amber-700 border-amber-200">{selected.analysis === undefined ? "Summarising…" : "Summary unavailable"}</Pill>}
              {selected.analysis?.urgency === "high" && <Pill cls="bg-red-50 text-red-700 border-red-200">Needs attention</Pill>}
              {selected.analysis && <Pill cls="bg-slate-50 text-slate-600 border-slate-200 capitalize">{selected.analysis.sentiment} tone</Pill>}
              {selected.sample && <Pill cls="bg-slate-50 text-slate-500 border-slate-200">Sample call</Pill>}
            </div>
            <div className="mt-4 rounded-xl bg-[#F7F6F3] p-4"><p className="text-[11px] font-medium uppercase tracking-wide text-[#1F5B4C]">AI summary</p>
              <p className="mt-1 text-sm leading-relaxed">{selected.analysis === undefined ? "Writing the summary, this takes a few seconds…" : selected.analysis?.summary ?? "The summary couldn't be generated for this call. The transcript below is complete."}</p></div>
            {selected.analysis && <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {[["Interested in", selected.analysis.intent], ["Details", selected.analysis.requirement], ["Preferred time", selected.analysis.preferredTime], ["Next step", selected.analysis.nextStep], ["Phone number", selected.sample ? "Shown here on real calls" : "Captured automatically on real phone calls"], ["Recording", "Available on real phone calls"]].map(([k, v]) => <div key={k as string}><dt className="text-xs text-black/45">{k}</dt><dd className="mt-0.5">{v ?? "-"}</dd></div>)}
            </dl>}
            <h4 className="mb-2 mt-5 text-sm font-medium">Transcript</h4>
            <div className="space-y-2">{selected.transcript.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : ""}`}><p className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${m.role === "user" ? "bg-[#1F5B4C] text-white" : "bg-[#F7F6F3]"}`}>{m.content}</p></div>))}</div>
          </div>
        </div>
      )}
    </div>
  );
}
