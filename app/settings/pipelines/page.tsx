"use client";
import { useState } from "react";
import { countOppsInStage, deleteStage, getFieldDefs, getPipelines, savePipeline } from "@/lib/api";
import { useAsync, useToast } from "@/lib/hooks";
import type { Pipeline } from "@/lib/types";
import { Badge, Button, Card, Input, Modal, Page, Select, State } from "@/components/ui";

export default function Stages() {
  const s = useAsync(getPipelines, []); const fields = useAsync(getFieldDefs, []); const toast = useToast();
  const [del, setDel] = useState<{ p: Pipeline; stageId: string } | null>(null); const [target, setTarget] = useState("");
  const update = async (p: Pipeline) => { await savePipeline(p); s.reload(); };
  const swap = (p: Pipeline, i: number, j: number) => { const st = [...p.stages]; [st[i], st[j]] = [st[j], st[i]]; update({ ...p, stages: st }); };
  return (
    <Page title="Pipeline stages">
      <State s={s}>{(ps) => (
        <div className="grid gap-4 md:grid-cols-2">
          {ps.map((p) => (
            <Card key={p.id} title={p.name} action={<Button variant="ghost" onClick={() => update({ ...p, stages: [...p.stages, { id: `s${Date.now()}`, name: "New stage", requiredFields: [] }] })}>+ Stage</Button>}>
              <ul className="space-y-3">
                {p.stages.map((st, i) => (
                  <li key={st.id} className="rounded-lg border border-slate-200 p-2">
                    <div className="flex items-center gap-2">
                      <Input value={st.name} onChange={(e) => update({ ...p, stages: p.stages.map((x) => x.id === st.id ? { ...x, name: e.target.value } : x) })} />
                      <button aria-label="Move up" disabled={i === 0} onClick={() => swap(p, i, i - 1)} className="px-1 disabled:opacity-30">↑</button>
                      <button aria-label="Move down" disabled={i === p.stages.length - 1} onClick={() => swap(p, i, i + 1)} className="px-1 disabled:opacity-30">↓</button>
                      <button aria-label="Delete stage" className="px-1 text-red-600" onClick={async () => { if (countOppsInStage(st.id) > 0) { setDel({ p, stageId: st.id }); setTarget(""); } else { await deleteStage(p.id, st.id, ""); s.reload(); } }}>🗑</button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1 text-xs"><span className="text-slate-500">Required to enter:</span>
                      {(fields.data ?? []).filter((f) => f.pipelineId === p.id || f.pipelineId === null).map((f) => {
                        const on = st.requiredFields.includes(f.key);
                        return <button key={f.key} onClick={() => update({ ...p, stages: p.stages.map((x) => x.id === st.id ? { ...x, requiredFields: on ? x.requiredFields.filter((k) => k !== f.key) : [...x.requiredFields, f.key] } : x) })}><Badge tone={on ? "amber" : "gray"}>{on ? "✓ " : ""}{f.label}</Badge></button>;
                      })}</div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}</State>
      <Modal open={!!del} onClose={() => setDel(null)} title="Stage has opportunities">
        {del && (<>
          <p className="mb-3 text-sm text-slate-600">{countOppsInStage(del.stageId)} opportunities are in this stage. Choose where to move them before deleting.</p>
          <Select value={target} onChange={(e) => setTarget(e.target.value)}><option value="">Select a stage…</option>{del.p.stages.filter((x) => x.id !== del.stageId).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select>
          <Button variant="danger" className="mt-3" disabled={!target} onClick={async () => { await deleteStage(del.p.id, del.stageId, target); setDel(null); toast("Stage deleted, opportunities moved"); s.reload(); }}>Move & delete</Button>
        </>)}
      </Modal>
    </Page>
  );
}
