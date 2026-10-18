"use client";
import { useState } from "react";
import Link from "next/link";
import { getPipelines, listOpportunities, moveOpportunity } from "@/lib/api";
import { useAsync, useSession, useToast } from "@/lib/hooks";
import { Page, Select, State, cx, money } from "@/components/ui";

export default function Pipeline() {
  const { canViewValue } = useSession(); const toast = useToast();
  const [pid, setPid] = useState("p1"); const [drag, setDrag] = useState<string | null>(null); const [over, setOver] = useState<string | null>(null);
  const pls = useAsync(getPipelines, []);
  const opps = useAsync(() => listOpportunities(pid), [pid], 5000);
  const move = async (oppId: string, stageId: string) => {
    try { await moveOpportunity(oppId, stageId); opps.reload(); } catch (e) { toast((e as Error).message, "err"); }
  };
  return (
    <Page title="Pipeline" actions={<Select className="w-48" value={pid} onChange={(e) => setPid(e.target.value)}>{pls.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>}>
      <State s={pls}>{(ps) => {
        const p = ps.find((x) => x.id === pid) ?? ps[0];
        return (
          <State s={opps} skeleton={6}>{(os) => (
            <div className="flex gap-3 overflow-x-auto pb-4 snap-x">
              {p.stages.map((st) => {
                const col = os.filter((o) => o.stageId === st.id);
                const total = col.reduce((s, o) => s + (o.value ?? 0), 0);
                return (
                  <div key={st.id} onDragOver={(e) => { e.preventDefault(); setOver(st.id); }} onDragLeave={() => setOver(null)}
                    onDrop={() => { setOver(null); if (drag) move(drag, st.id); setDrag(null); }}
                    className={cx("w-64 shrink-0 snap-start rounded-xl border bg-slate-100 p-2", over === st.id ? "border-indigo-500 bg-indigo-50" : "border-slate-200")}>
                    <div className="mb-2 px-1"><p className="text-sm font-semibold">{st.name} <span className="font-normal text-slate-500">({col.length})</span></p><p className="text-xs text-slate-500">{money(total, canViewValue)}</p>{st.requiredFields.length > 0 && <p className="text-[10px] text-amber-700">Requires: {st.requiredFields.join(", ")}</p>}</div>
                    <div className="space-y-2">
                      {col.map((o) => (
                        <div key={o.id} draggable onDragStart={() => setDrag(o.id)} className="cursor-grab rounded-lg border border-slate-200 bg-white p-2.5 text-sm shadow-sm active:cursor-grabbing">
                          <Link href={`/opportunities/${o.id}`} className="font-medium text-indigo-700 hover:underline">{o.title}</Link>
                          <p className="text-xs text-slate-500">{o.contactName}</p>
                          <p className="mt-1 text-xs font-semibold">{money(o.value, canViewValue)}</p>
                          {/* list/keyboard/touch fallback for moving cards (drag doesn't work on phones) */}
                          <select aria-label="Move to stage" className="mt-2 w-full rounded border border-slate-200 bg-white p-1 text-xs" value={o.stageId} onChange={(e) => move(o.id, e.target.value)}>
                            {p.stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}</State>
        );
      }}</State>
    </Page>
  );
}
