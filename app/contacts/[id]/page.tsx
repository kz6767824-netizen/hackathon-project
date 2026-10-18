"use client";
import { use, useState } from "react";
import { acknowledgeLead, addNote, getContact, sendMessage } from "@/lib/api";
import { useAsync, useSession, useToast } from "@/lib/hooks";
import { A, Badge, Button, Card, Empty, Input, Page, State, fmtDate, money, statusTone } from "@/components/ui";
import { Timeline } from "@/components/Timeline";
import { useRouter } from "next/navigation";

export default function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); const toast = useToast(); const { canViewValue } = useSession(); const router = useRouter();
  const s = useAsync(() => getContact(id), [id], 5000);
  const [msg, setMsg] = useState(""); const [note, setNote] = useState("");
  return (
    <Page title="Customer" actions={<Button variant="ghost" onClick={() => router.back()}>← Back</Button>}>
      <State s={s} skeleton={6}>
        {(d) => (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">{d.contact.name}</h2>
                    <p className="text-sm text-slate-600">{d.contact.phone} · {d.contact.email}</p>
                    <p className="mt-1 text-sm text-slate-600">{d.company ? <A href={`/companies/${d.company.id}`}>{d.company.name}</A> : "No company"} · Owner: <b>{d.owner.name}</b></p>
                    <div className="mt-2 flex flex-wrap gap-1"><Badge tone={statusTone(d.contact.status)}>{d.contact.status}</Badge>{d.contact.optedOut && <Badge tone="red">opted out</Badge>}{d.contact.tags.map((t) => <Badge key={t}>{t}</Badge>)}</div>
                  </div>
                  {d.contact.status === "new" && <Button onClick={async () => { await acknowledgeLead(id); toast("Lead acknowledged"); s.reload(); }}>Acknowledge{d.contact.ackDeadline && ` (due ${fmtDate(d.contact.ackDeadline)})`}</Button>}
                </div>
              </Card>

              <Card title="Conversation">
                <div className="mb-3 max-h-72 space-y-2 overflow-y-auto">
                  {d.messages.length === 0 ? <Empty>No messages yet.</Empty> : d.messages.map((m) => (
                    <div key={m.id} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.direction === "out" ? "ml-auto bg-indigo-600 text-white" : "bg-slate-100"}`}>{m.text}</div>
                  ))}
                </div>
                {d.contact.optedOut ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">This contact opted out (replied STOP). Messaging is disabled to comply with their request.</p> : (
                  <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (!msg.trim()) return; try { await sendMessage(id, msg); setMsg(""); s.reload(); } catch (er) { toast((er as Error).message, "err"); } }}>
                    <Input placeholder="Reply via WhatsApp…" value={msg} onChange={(e) => setMsg(e.target.value)} /><Button type="submit">Send</Button>
                  </form>
                )}
              </Card>

              <Card title="Opportunities">
                {d.opportunities.length === 0 ? <Empty>No opportunities.</Empty> : <ul className="divide-y divide-slate-100">{d.opportunities.map((o) => <li key={o.id} className="flex items-center justify-between py-2 text-sm"><A href={`/opportunities/${o.id}`}>{o.title}</A><span>{money(o.value, canViewValue)}</span></li>)}</ul>}
              </Card>
              <div className="grid gap-4 md:grid-cols-2">
                <Card title="Payments">
                  {d.payments.length === 0 ? <Empty>No payment requests.</Empty> : <ul className="space-y-2">{d.payments.map((p) => <li key={p.id} className="text-sm"><div className="flex items-center justify-between"><span>{p.currency} {p.amount.toLocaleString()}</span><Badge tone={statusTone(p.status)}>{p.status}</Badge></div><p className="text-xs text-slate-500">Ref {p.ref}</p></li>)}</ul>}
                </Card>
                <Card title="Appointments">
                  {d.appointments.length === 0 ? <Empty>No appointments booked.</Empty> : <ul className="space-y-2">{d.appointments.map((a) => <li key={a.id} className="text-sm"><b>{a.title}</b><p className="text-xs text-slate-500">{fmtDate(a.start)}</p></li>)}</ul>}
                </Card>
              </div>
            </div>
            <Card title="Activity history" className="h-fit">
              <form className="mb-3 flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (!note.trim()) return; await addNote(id, note); setNote(""); s.reload(); }}>
                <Input placeholder="Add a note…" value={note} onChange={(e) => setNote(e.target.value)} /><Button type="submit" variant="ghost">Add</Button>
              </form>
              <Timeline items={d.activity} />
            </Card>
          </div>
        )}
      </State>
    </Page>
  );
}
