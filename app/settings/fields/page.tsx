"use client";
import { useState } from "react";
import { addField, deleteField, getFieldDefs, getPipelines } from "@/lib/api";
import { useAsync, useToast } from "@/lib/hooks";
import type { FieldType } from "@/lib/types";
import { Badge, Button, Card, Input, Label, Page, Select, State, Table, Td } from "@/components/ui";

export default function Fields() {
  const s = useAsync(getFieldDefs, []); const pls = useAsync(getPipelines, []); const toast = useToast();
  const [label, setLabel] = useState(""); const [type, setType] = useState<FieldType>("text"); const [opts, setOpts] = useState(""); const [pid, setPid] = useState("");
  return (
    <Page title="Custom fields">
      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <Card title="Add a field" className="h-fit">
          <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); await addField({ label, type, options: type === "dropdown" ? opts.split(",").map((x) => x.trim()).filter(Boolean) : undefined, pipelineId: pid || null }); setLabel(""); setOpts(""); toast("Field added — it now appears on forms"); s.reload(); }}>
            <div><Label>Name</Label><Input required value={label} onChange={(e) => setLabel(e.target.value)} /></div>
            <div><Label>Type</Label><Select value={type} onChange={(e) => setType(e.target.value as FieldType)}>{["text", "number", "date", "dropdown", "checkbox"].map((t) => <option key={t}>{t}</option>)}</Select></div>
            {type === "dropdown" && <div><Label>Options (comma separated)</Label><Input value={opts} onChange={(e) => setOpts(e.target.value)} /></div>}
            <div><Label>Pipeline</Label><Select value={pid} onChange={(e) => setPid(e.target.value)}><option value="">All pipelines</option>{pls.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></div>
            <Button type="submit">Add field</Button>
          </form>
        </Card>
        <State s={s}>{(fs) => (
          <Table head={["Field", "Type", "Pipeline", ""]}>
            {fs.map((f) => <tr key={f.key}><Td className="font-medium">{f.label}</Td><Td><Badge>{f.type}</Badge></Td><Td>{pls.data?.find((p) => p.id === f.pipelineId)?.name ?? "All"}</Td><Td><button className="text-red-600 hover:underline" onClick={async () => { if (confirm(`Delete "${f.label}"?`)) { await deleteField(f.key); s.reload(); } }}>Delete</button></Td></tr>)}
          </Table>
        )}</State>
      </div>
    </Page>
  );
}
