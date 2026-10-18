"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createContact, deleteList, getCompanies, getEmployees, getPipelines, getSavedLists, listContacts, saveList } from "@/lib/api";
import { useAsync, useToast } from "@/lib/hooks";
import type { Criteria, LeadStatus } from "@/lib/types";
import { A, Badge, Button, Card, Empty, Input, Modal, Page, Select, State, Table, Td, ago, statusTone } from "@/components/ui";

const TAGS = ["hot", "referral", "website", "whatsapp", "vip", "follow-up", "manual"];

function Contacts() {
  const sp = useSearchParams(); const router = useRouter(); const toast = useToast();
  const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); };
  const initial: Criteria = {
    q: sp.get("q") ?? "", ownerId: sp.get("ownerId") ?? "", tag: sp.get("tag") ?? "", status: (sp.get("status") as LeadStatus) ?? "", stageId: sp.get("stageId") ?? "",
    createdAfter: sp.get("createdAfter") === "today" ? startOfToday() : sp.get("createdAfter") ?? "",
  };
  const [f, setF] = useState<Criteria>(initial);
  const [page, setPage] = useState(1);
  const [saveOpen, setSaveOpen] = useState(false); const [listName, setListName] = useState("");
  const [newOpen, setNewOpen] = useState(false); const [nc, setNc] = useState({ name: "", phone: "", email: "", companyId: "" });
  const [debounced, setDebounced] = useState(f);
  useEffect(() => { const t = setTimeout(() => { setDebounced(f); setPage(1); }, 250); return () => clearTimeout(t); }, [f]);
  const list = useAsync(() => listContacts(debounced, page), [debounced, page], 5000);
  const emps = useAsync(getEmployees, []); const comps = useAsync(getCompanies, []); const pls = useAsync(getPipelines, []);
  const saved = useAsync(getSavedLists, [], 5000);
  const active = Object.values(f).filter(Boolean).length;
  const set = (k: keyof Criteria, v: string) => setF((p) => ({ ...p, [k]: v }));
  const stages = pls.data?.flatMap((p) => p.stages.map((s) => ({ id: s.id, label: `${p.name} › ${s.name}` }))) ?? [];

  return (
    <Page title="Contacts" actions={<><Button variant="ghost" disabled={active < 1} onClick={() => setSaveOpen(true)}>Save as list</Button><Button onClick={() => setNewOpen(true)}>+ New contact</Button></>}>
      <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
        <div className="min-w-0 space-y-3">
          <Card>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <Input placeholder="Search name, phone, email…" value={f.q} onChange={(e) => set("q", e.target.value)} />
              <Select value={f.ownerId} onChange={(e) => set("ownerId", e.target.value)}><option value="">Any owner</option>{emps.data?.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</Select>
              <Select value={f.status} onChange={(e) => set("status", e.target.value)}><option value="">Any status</option>{["new", "acknowledged", "escalated", "open"].map((s) => <option key={s}>{s}</option>)}</Select>
              <Select value={f.tag} onChange={(e) => set("tag", e.target.value)}><option value="">Any tag</option>{TAGS.map((t) => <option key={t}>{t}</option>)}</Select>
              <Select value={f.stageId} onChange={(e) => set("stageId", e.target.value)}><option value="">Any stage</option>{stages.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</Select>
              <Select value={f.createdAfter ? "7" : ""} onChange={(e) => set("createdAfter", e.target.value ? new Date(Date.now() - Number(e.target.value) * 86400000).toISOString() : "")}><option value="">Any date</option><option value="1">Last 24 hours</option><option value="7">Last 7 days</option></Select>
            </div>
            {active > 0 && <button className="mt-2 text-xs text-indigo-700 hover:underline" onClick={() => { setF({ q: "", ownerId: "", tag: "", status: "", stageId: "", createdAfter: "" }); router.replace("/contacts"); }}>Clear {active} filter{active > 1 ? "s" : ""}</button>}
          </Card>
          <State s={list} skeleton={6}>
            {({ items, total }) => items.length === 0 ? <Empty>No contacts match these filters.</Empty> : (
              <>
                <Table head={["Name", "Phone", "Status", "Owner", "Tags", "Created"]}>
                  {items.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <Td><A href={`/contacts/${c.id}`}>{c.name}</A>{c.optedOut && <span className="ml-2"><Badge tone="red">opted out</Badge></span>}</Td>
                      <Td>{c.phone}</Td><Td><Badge tone={statusTone(c.status)}>{c.status}</Badge></Td>
                      <Td>{emps.data?.find((e) => e.id === c.ownerId)?.name ?? "…"}</Td>
                      <Td><div className="flex flex-wrap gap-1">{c.tags.map((t) => <Badge key={t}>{t}</Badge>)}</div></Td><Td>{ago(c.createdAt)}</Td>
                    </tr>
                  ))}
                </Table>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>{total} contacts</span>
                  <div className="flex items-center gap-2"><Button variant="ghost" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</Button><span>Page {page} / {Math.max(1, Math.ceil(total / 10))}</span><Button variant="ghost" disabled={page * 10 >= total} onClick={() => setPage(page + 1)}>Next</Button></div>
                </div>
              </>
            )}
          </State>
        </div>
        <Card title="Saved lists" className="h-fit">
          {!saved.data?.length ? <p className="text-sm text-slate-500">Set 1+ filters, then “Save as list”. Counts update live.</p> : (
            <ul className="space-y-2">{saved.data.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-2 text-sm">
                <button className="text-left font-medium text-indigo-700 hover:underline" onClick={() => setF({ q: "", ownerId: "", tag: "", status: "", stageId: "", createdAfter: "", ...l.criteria })}>{l.name} <Badge tone="indigo">{l.count}</Badge></button>
                <button aria-label="Delete list" className="text-slate-400 hover:text-red-600" onClick={() => { deleteList(l.id); saved.reload(); }}>×</button>
              </li>))}</ul>
          )}
        </Card>
      </div>
      <Modal open={saveOpen} onClose={() => setSaveOpen(false)} title="Save as list">
        <Input placeholder="List name" value={listName} onChange={(e) => setListName(e.target.value)} />
        <Button className="mt-3" disabled={!listName.trim()} onClick={() => { saveList(listName.trim(), f); setListName(""); setSaveOpen(false); saved.reload(); toast("List saved"); }}>Save</Button>
      </Modal>
      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="New contact (manual lead)">
        <div className="space-y-2">
          <Input placeholder="Full name" value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} />
          <Input placeholder="Phone" value={nc.phone} onChange={(e) => setNc({ ...nc, phone: e.target.value })} />
          <Input placeholder="Email" value={nc.email} onChange={(e) => setNc({ ...nc, email: e.target.value })} />
          <Select value={nc.companyId} onChange={(e) => setNc({ ...nc, companyId: e.target.value })}><option value="">No company</option>{comps.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          <Button disabled={!nc.name || !nc.phone} onClick={async () => { await createContact({ ...nc, companyId: nc.companyId || null }); setNewOpen(false); setNc({ name: "", phone: "", email: "", companyId: "" }); list.reload(); toast("Lead created and assigned"); }}>Create</Button>
        </div>
      </Modal>
    </Page>
  );
}
export default function Wrapper() { return <Suspense fallback={null}><Contacts /></Suspense>; }
