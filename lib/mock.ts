import type { Activity, Appointment, Company, Contact, Employee, FieldDef, Message, Opportunity, Payment, Pipeline } from "./types";

// Deterministic pseudo-random so SSR/CSR match
let seed = 7;
const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
const NOW = Date.now();
const ago = (mins: number) => new Date(NOW - mins * 60000).toISOString();
const ahead = (mins: number) => new Date(NOW + mins * 60000).toISOString();

export const employees: Employee[] = [
  { id: "e1", name: "Ayesha Khan", role: "Owner", status: "available", openLeads: 4 },
  { id: "e2", name: "Bilal Ahmed", role: "Admin", status: "available", openLeads: 6 },
  { id: "e3", name: "Sara Malik", role: "User", status: "away", openLeads: 3 },
  { id: "e4", name: "Omar Farooq", role: "User", status: "offline", openLeads: 0 },
  { id: "e5", name: "Hina Raza", role: "User", status: "available", openLeads: 5 },
];

export const companies: Company[] = [
  { id: "c1", name: "Sunrise Solar", industry: "Solar" },
  { id: "c2", name: "Bright Homes Realty", industry: "Real estate" },
  { id: "c3", name: "CareFirst Clinic", industry: "Healthcare" },
  { id: "c4", name: "Metro Builders", industry: "Construction" },
  { id: "c5", name: "GreenGrid Energy", industry: "Solar" },
  { id: "c6", name: "Lakeview Estates", industry: "Real estate" },
];

export const pipelines: Pipeline[] = [
  { id: "p1", name: "Sales", stages: [
    { id: "s1", name: "New", requiredFields: [] },
    { id: "s2", name: "Qualified", requiredFields: ["budget"] },
    { id: "s3", name: "Proposal", requiredFields: ["budget", "site_visit"] },
    { id: "s4", name: "Won", requiredFields: [], kind: "won" },
    { id: "s5", name: "Lost", requiredFields: [], kind: "lost" },
  ]},
  { id: "p2", name: "Patient intake", stages: [
    { id: "t1", name: "Enquiry", requiredFields: [] },
    { id: "t2", name: "Booked", requiredFields: ["insurance"] },
    { id: "t3", name: "Completed", requiredFields: [], kind: "won" },
    { id: "t4", name: "No-show", requiredFields: [], kind: "lost" },
  ]},
];

export const fieldDefs: FieldDef[] = [
  { key: "budget", label: "Budget (PKR)", type: "number", pipelineId: "p1" },
  { key: "site_visit", label: "Site visit date", type: "date", pipelineId: "p1" },
  { key: "roof_type", label: "Roof type", type: "dropdown", options: ["Flat", "Sloped", "Metal"], pipelineId: "p1" },
  { key: "financing", label: "Needs financing", type: "checkbox", pipelineId: "p1" },
  { key: "insurance", label: "Insurance provider", type: "text", pipelineId: "p2" },
  { key: "notes_ext", label: "Referral source", type: "text", pipelineId: null },
];

const first = ["Ali", "Zain", "Maryam", "Fatima", "Usman", "Noor", "Hamza", "Iqra", "Saad", "Mehwish", "Danish", "Rabia", "Talha", "Anum", "Faisal"];
const last = ["Sheikh", "Butt", "Chaudhry", "Qureshi", "Siddiqui", "Javed", "Mirza", "Abbasi", "Hussain", "Rana"];
const tags = ["hot", "referral", "website", "whatsapp", "vip", "follow-up"];
const statuses = ["new", "acknowledged", "escalated", "open"] as const;

export const contacts: Contact[] = Array.from({ length: 48 }, (_, i) => {
  const status = pick([...statuses]);
  const created = Math.floor(rnd() * 60 * 24 * 10) + 5;
  return {
    id: `k${i + 1}`,
    name: `${pick(first)} ${pick(last)}`,
    phone: `+92 3${Math.floor(rnd() * 5)}${Math.floor(rnd() * 10)} ${String(Math.floor(rnd() * 9000000) + 1000000)}`,
    email: `user${i + 1}@example.com`,
    companyId: rnd() > 0.15 ? pick(companies).id : null,
    ownerId: pick(employees.filter((e) => e.status !== "offline")).id,
    tags: Array.from(new Set([pick(tags), pick(tags)])),
    optedOut: rnd() > 0.93,
    status,
    createdAt: ago(created),
    lastTouch: ago(Math.floor(created * rnd())),
    escalations: status === "escalated" ? Math.floor(rnd() * 3) + 1 : 0,
    ackDeadline: status === "new" ? (rnd() > 0.5 ? ahead(Math.floor(rnd() * 30) + 1) : ago(Math.floor(rnd() * 90) + 1)) : null,
  };
});

export const opportunities: Opportunity[] = Array.from({ length: 26 }, (_, i) => {
  const pipelineId = i % 5 === 0 ? "p2" : "p1";
  const stage = pick(pipelines.find((p) => p.id === pipelineId)!.stages);
  return {
    id: `o${i + 1}`,
    title: pipelineId === "p2" ? `Consultation #${i + 1}` : `${pick(["Solar 5kW", "Solar 10kW", "Home purchase", "Renovation", "Plot sale"])} #${i + 1}`,
    contactId: contacts[(i * 2) % contacts.length].id,
    pipelineId, stageId: stage.id,
    value: Math.floor(rnd() * 90) * 50000 + 100000,
    ownerId: pick(employees).id,
    custom: (pipelineId === "p1" ? { budget: rnd() > 0.4 ? Math.floor(rnd() * 80) * 50000 + 200000 : null, site_visit: rnd() > 0.5 ? "2026-10-25" : null, roof_type: pick(["Flat", "Sloped", "Metal"]), financing: rnd() > 0.5 } : { insurance: rnd() > 0.5 ? "Jubilee" : null }) as Opportunity["custom"],
  };
});

export const payments: Payment[] = Array.from({ length: 12 }, (_, i) => ({
  id: `pay${i + 1}`, opportunityId: opportunities[i].id, contactId: opportunities[i].contactId,
  amount: (Math.floor(rnd() * 20) + 5) * 5000, currency: "PKR",
  status: pick(["paid", "paid", "paid", "pending", "failed", "expired", "refunded"] as const),
  ref: `pi_${Math.floor(rnd() * 1e9).toString(36)}`, requestedBy: pick(employees).id, createdAt: ago(Math.floor(rnd() * 60 * 24 * 20)),
}));

export const appointments: Appointment[] = Array.from({ length: 8 }, (_, i) => {
  const mins = Math.floor(rnd() * 60 * 24 * 6) + 30;
  return { id: `a${i + 1}`, contactId: contacts[i * 3].id, employeeId: pick(employees).id, title: pick(["Site survey", "Consultation", "Property viewing", "Follow-up call"]), start: ahead(mins), end: ahead(mins + 45) };
});

export const messages: Message[] = contacts.slice(0, 20).flatMap((c, i) => [
  { id: `m${i}a`, contactId: c.id, direction: "in" as const, text: pick(["Hi, I'd like a quote please", "Are you available this week?", "What's the price for 5kW?", "Please call me back"]), at: ago(300 + i * 40) },
  { id: `m${i}b`, contactId: c.id, direction: "out" as const, text: "Thanks for reaching out! I'll get back to you shortly.", at: ago(280 + i * 40) },
]);

export const activities: Activity[] = contacts.slice(0, 30).flatMap((c, i) => [
  { id: `ac${i}a`, contactId: c.id, type: "assignment", text: "Lead assigned (round-robin)", actor: "System", at: ago(600 + i * 30) },
  { id: `ac${i}b`, contactId: c.id, type: "note", text: "Called, asked to follow up tomorrow", actor: pick(employees).name, at: ago(200 + i * 20) },
]);
