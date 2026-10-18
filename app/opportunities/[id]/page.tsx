"use client";
import { use, useState } from "react";
import { getOpportunity, saveOpportunityFields } from "@/lib/api";
import { useAsync, useSession, useToast } from "@/lib/hooks";
import { A, Badge, Button, Card, Empty, Page, State, money, statusTone } from "@/components/ui";
import { DynamicForm } from "@/components/DynamicForm";
import { Timeline } from "@/components/Timeline";

export default function OppPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); const { canViewValue } = useSession(); const toast = useToast();
  const s = useAsync(() => getOpportunity(id), [id]); const [saving, setSaving] = useState(false);
  return (
    <Page title="Opportunity" actions={<Button variant="ghost" onClick={() => history.back()}>← Back</Button>}>
      <State s={s} skeleton={5}>{({ opportunity: o, pipeline, contact, fields, payments, activity }) => (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card>
              <h2 className="text-xl font-bold">{o.title}</h2>
              <p className="text-sm text-slate-600">{pipeline.name} › <b>{pipeline.stages.find((x) => x.id === o.stageId)?.name}</b> · Value {money(o.value, canViewValue)}</p>
              <p className="text-sm">Contact: <A href={`/contacts/${contact.id}`}>{contact.name}</A></p>
            </Card>
            <Card title="Custom fields">
              <DynamicForm fields={fields} values={o.custom} saving={saving} onSave={async (v) => { setSaving(true); await saveOpportunityFields(id, v); setSaving(false); toast("Fields saved"); s.reload(); }} />
            </Card>
            <Card title="Payments">
              {payments.length === 0 ? <Empty>No payment requests yet.</Empty> : <ul className="space-y-2">{payments.map((p) => <li key={p.id} className="flex items-center justify-between text-sm"><span>{p.currency} {p.amount.toLocaleString()} <span className="text-xs text-slate-500">· {p.ref}</span></span><Badge tone={statusTone(p.status)}>{p.status}</Badge></li>)}</ul>}
            </Card>
          </div>
          <Card title="Activity" className="h-fit"><Timeline items={activity} /></Card>
        </div>
      )}</State>
    </Page>
  );
}
