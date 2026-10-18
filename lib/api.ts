/**
 * THE ONLY FILE HUSAIN'S BACKEND PLUGS INTO.
 * Every screen calls these functions. Today they read mock data; later replace
 * each body with fetch("/api/...") returning the same shapes (see lib/types.ts).
 */
import * as M from "./mock";
import type { Activity, Appointment, Company, Contact, Criteria, Employee, FieldDef, LeadStatus, Message, Opportunity, Payment, Pipeline, RecoveryItem, Role, SavedList } from "./types";

const delay = <T,>(v: T, ms = 250) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), ms));
const store = {
  employees: [...M.employees], contacts: [...M.contacts], opportunities: [...M.opportunities],
  pipelines: structuredClone(M.pipelines), fieldDefs: [...M.fieldDefs],
  activities: [...M.activities], messages: [...M.messages],
};
const ls = {
  get<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const empName = (id: string) => store.employees.find((e) => e.id === id)?.name ?? "Unknown";
const log = (a: Omit<Activity, "id" | "at">) => store.activities.unshift({ ...a, id: `ac${Date.now()}${Math.random()}`, at: new Date().toISOString() });

// ---------- Employees ----------
export const getEmployees = () => delay<Employee[]>(store.employees);
export async function setEmployeeStatus(id: string, status: Employee["status"]) {
  const e = store.employees.find((x) => x.id === id)!; e.status = status; return delay(e, 100);
}

// ---------- Contacts ----------
export function matches(c: Contact, f: Criteria) {
  if (f.q && !`${c.name} ${c.phone} ${c.email}`.toLowerCase().includes(f.q.toLowerCase())) return false;
  if (f.ownerId && c.ownerId !== f.ownerId) return false;
  if (f.tag && !c.tags.includes(f.tag)) return false;
  if (f.status && c.status !== f.status) return false;
  if (f.createdAfter && new Date(c.createdAt) < new Date(f.createdAfter)) return false;
  if (f.stageId && !store.opportunities.some((o) => o.contactId === c.id && o.stageId === f.stageId)) return false;
  return true;
}
export async function listContacts(f: Criteria, page = 1, pageSize = 10) {
  const all = store.contacts.filter((c) => matches(c, f)).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  return delay({ items: all.slice((page - 1) * pageSize, page * pageSize), total: all.length });
}
export async function getContact(id: string) {
  const contact = store.contacts.find((c) => c.id === id);
  if (!contact) throw new Error("Contact not found");
  return delay({
    contact, company: M.companies.find((c) => c.id === contact.companyId) ?? null,
    owner: store.employees.find((e) => e.id === contact.ownerId)!,
    opportunities: store.opportunities.filter((o) => o.contactId === id),
    payments: M.payments.filter((p) => p.contactId === id),
    appointments: M.appointments.filter((a) => a.contactId === id),
    messages: store.messages.filter((m) => m.contactId === id).sort((a, b) => +new Date(a.at) - +new Date(b.at)),
    activity: store.activities.filter((a) => a.contactId === id),
  });
}
export async function acknowledgeLead(id: string) {
  const c = store.contacts.find((x) => x.id === id)!; c.status = "acknowledged"; c.ackDeadline = null;
  log({ contactId: id, type: "ack", text: "Lead acknowledged", actor: empName(c.ownerId) }); return delay(c, 100);
}
export async function addNote(contactId: string, text: string, actor = "You") { log({ contactId, type: "note", text, actor }); return delay(true, 100); }
export async function sendMessage(contactId: string, text: string) {
  const c = store.contacts.find((x) => x.id === contactId)!;
  if (c.optedOut) throw new Error("This contact has opted out of messages. You can't message them.");
  store.messages.push({ id: `m${Date.now()}`, contactId, direction: "out", text, at: new Date().toISOString() });
  log({ contactId, type: "message", text: `Message sent: ${text}`, actor: "You" }); return delay(true, 150);
}
export async function createContact(d: { name: string; phone: string; email: string; companyId: string | null }) {
  const owner = store.employees.find((e) => e.status === "available")!;
  const c: Contact = { id: `k${Date.now()}`, ...d, ownerId: owner.id, tags: ["manual"], optedOut: false, status: "new", createdAt: new Date().toISOString(), lastTouch: new Date().toISOString(), escalations: 0, ackDeadline: new Date(Date.now() + 20 * 60000).toISOString() };
  store.contacts.unshift(c); return delay(c);
}

// ---------- Companies ----------
export const getCompanies = () => delay(M.companies.map((c) => ({ ...c, contacts: store.contacts.filter((k) => k.companyId === c.id).length })));
export async function getCompany(id: string): Promise<{ company: Company; contacts: Contact[] }> {
  return delay({ company: M.companies.find((c) => c.id === id)!, contacts: store.contacts.filter((k) => k.companyId === id) });
}

// ---------- Pipelines / opportunities ----------
export const getPipelines = () => delay<Pipeline[]>(store.pipelines);
export const getFieldDefs = () => delay<FieldDef[]>(store.fieldDefs);
export async function listOpportunities(pipelineId: string) {
  return delay(store.opportunities.filter((o) => o.pipelineId === pipelineId).map((o) => ({ ...o, contactName: store.contacts.find((c) => c.id === o.contactId)?.name ?? "—" })));
}
export async function getOpportunity(id: string) {
  const o = store.opportunities.find((x) => x.id === id);
  if (!o) throw new Error("Opportunity not found");
  const pipeline = store.pipelines.find((p) => p.id === o.pipelineId)!;
  return delay({
    opportunity: o, pipeline, contact: store.contacts.find((c) => c.id === o.contactId)!,
    fields: store.fieldDefs.filter((f) => f.pipelineId === null || f.pipelineId === o.pipelineId),
    payments: M.payments.filter((p) => p.opportunityId === id),
    activity: store.activities.filter((a) => a.opportunityId === id || (a.contactId === o.contactId && !a.opportunityId)).slice(0, 15),
  });
}
/** Server must reject moves that miss stage-required fields (F2.4). Mirror: throw Error(message). */
export async function moveOpportunity(id: string, stageId: string) {
  const o = store.opportunities.find((x) => x.id === id)!;
  const stage = store.pipelines.find((p) => p.id === o.pipelineId)!.stages.find((s) => s.id === stageId)!;
  const missing = stage.requiredFields.filter((k) => { const v = o.custom[k]; return v === null || v === undefined || v === ""; });
  if (missing.length) {
    const labels = missing.map((k) => store.fieldDefs.find((f) => f.key === k)?.label ?? k).join(", ");
    await delay(0, 150); throw new Error(`Can't move to "${stage.name}" — fill in: ${labels}`);
  }
  const from = store.pipelines.find((p) => p.id === o.pipelineId)!.stages.find((s) => s.id === o.stageId)!.name;
  o.stageId = stageId; log({ contactId: o.contactId, opportunityId: id, type: "stage", text: `Stage: ${from} → ${stage.name}`, actor: "You" });
  return delay(o, 150);
}
export async function saveOpportunityFields(id: string, custom: Opportunity["custom"], value?: number | null) {
  const o = store.opportunities.find((x) => x.id === id)!; o.custom = { ...o.custom, ...custom }; if (value !== undefined) o.value = value;
  log({ contactId: o.contactId, opportunityId: id, type: "field", text: "Fields updated", actor: "You" }); return delay(o, 150);
}
export async function addField(f: Omit<FieldDef, "key">) { const def = { ...f, key: f.label.toLowerCase().replace(/[^a-z0-9]+/g, "_") + Date.now() % 1000 }; store.fieldDefs.push(def); return delay(def, 100); }
export async function deleteField(key: string) { store.fieldDefs = store.fieldDefs.filter((f) => f.key !== key); return delay(true, 100); }
export async function savePipeline(p: Pipeline) {
  const i = store.pipelines.findIndex((x) => x.id === p.id); store.pipelines[i] = p; return delay(p, 100);
}
/** Deleting a stage with opportunities requires a target stage to move them to. */
export async function deleteStage(pipelineId: string, stageId: string, moveToStageId: string) {
  const p = store.pipelines.find((x) => x.id === pipelineId)!;
  store.opportunities.filter((o) => o.stageId === stageId).forEach((o) => (o.stageId = moveToStageId));
  p.stages = p.stages.filter((s) => s.id !== stageId); return delay(p, 100);
}
export const countOppsInStage = (stageId: string) => store.opportunities.filter((o) => o.stageId === stageId).length;

// ---------- Saved lists ----------
export async function getSavedLists(): Promise<(SavedList & { count: number })[]> {
  const lists = ls.get<SavedList[]>("savedLists", []);
  return delay(lists.map((l) => ({ ...l, count: store.contacts.filter((c) => matches(c, l.criteria)).length })), 100); // live: re-evaluated each call
}
export function saveList(name: string, criteria: Criteria) { ls.set("savedLists", [...ls.get<SavedList[]>("savedLists", []), { id: `l${Date.now()}`, name, criteria }]); }
export function deleteList(id: string) { ls.set("savedLists", ls.get<SavedList[]>("savedLists", []).filter((l) => l.id !== id)); }

// ---------- Recovery queue ----------
export async function getRecovery(): Promise<RecoveryItem[]> {
  const now = Date.now();
  const items = store.contacts.map((c) => {
    const reasons: string[] = [];
    if (c.status === "new" && c.ackDeadline && new Date(c.ackDeadline).getTime() < now) reasons.push("Unacknowledged past window");
    if (c.escalations > 1) reasons.push(`Escalated ${c.escalations} times`);
    if (now - new Date(c.lastTouch).getTime() > 3 * 86400000 && c.status !== "acknowledged") reasons.push("Untouched for 3+ days");
    return { contact: c, reasons };
  }).filter((x) => x.reasons.length);
  return delay(items);
}

// ---------- Dashboard ----------
export interface DashFigure { id: string; label: string; value: string; hint?: string; href: string; scope: "all" | "personal"; sensitive?: boolean }
export async function getDashboard(role: Role, meId: string, canViewValue: boolean): Promise<DashFigure[]> {
  const personal = role === "User";
  const cs = store.contacts.filter((c) => !personal || c.ownerId === meId);
  const today = new Date().toDateString();
  const open = store.opportunities.filter((o) => (!personal || o.ownerId === meId) && !store.pipelines.flatMap((p) => p.stages).find((s) => s.id === o.stageId)?.kind);
  const pipeValue = open.reduce((s, o) => s + (o.value ?? 0), 0);
  const collected = M.payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const rec = (await getRecovery()).filter((r) => !personal || r.contact.ownerId === meId).length;
  const fmt = (n: number) => "PKR " + n.toLocaleString();
  const figs: DashFigure[] = [
    { id: "newToday", label: personal ? "My new leads today" : "New leads today", value: String(cs.filter((c) => new Date(c.createdAt).toDateString() === today).length), href: "/contacts?createdAfter=today", scope: "personal" },
    { id: "pipeline", label: "Open pipeline value", value: canViewValue ? fmt(pipeValue) : "•••• (hidden)", hint: `${open.length} open deals`, href: "/pipeline", scope: "personal", sensitive: true },
    { id: "response", label: personal ? "My avg. first response" : "Avg. first response", value: personal ? "6 min" : "11 min", href: "/contacts?status=acknowledged", scope: "personal" },
    { id: "recovery", label: "Recovery queue", value: String(rec), hint: "needs attention", href: "/recovery", scope: "personal" },
    { id: "esc", label: "Escalations (24h)", value: String(cs.filter((c) => c.status === "escalated").length), href: "/contacts?status=escalated", scope: "personal" },
    { id: "avail", label: "Employees available", value: `${store.employees.filter((e) => e.status === "available").length}/${store.employees.length}`, href: "/employees", scope: "all" },
    { id: "appts", label: "Upcoming appointments", value: String(M.appointments.filter((a) => (!personal || a.employeeId === meId)).length), href: "/contacts", scope: "personal" },
    { id: "revenue", label: "Collected this month", value: canViewValue ? fmt(collected) : "•••• (hidden)", hint: "paid only", href: "/contacts", scope: "all", sensitive: true },
  ];
  return delay(figs.filter((f) => !personal || f.scope === "personal"), 300);
}
export const getPrefs = () => ls.get<{ hidden: string[] }>("dashPrefs", { hidden: [] });
export const setPrefs = (p: { hidden: string[] }) => ls.set("dashPrefs", p); // TODO: store on server per user (F5.5)

export const me = { id: "e1" };
