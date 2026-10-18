export type Role = "Owner" | "Admin" | "User";
export type Availability = "available" | "away" | "offline";
export type LeadStatus = "new" | "acknowledged" | "escalated" | "open";
export type FieldType = "text" | "number" | "date" | "dropdown" | "checkbox";

export interface Employee { id: string; name: string; role: Role; status: Availability; openLeads: number }
export interface Company { id: string; name: string; industry: string }
export interface Contact {
  id: string; name: string; phone: string; email: string; companyId: string | null;
  ownerId: string; tags: string[]; optedOut: boolean; status: LeadStatus;
  createdAt: string; lastTouch: string; escalations: number; ackDeadline: string | null;
}
export interface Stage { id: string; name: string; requiredFields: string[]; kind?: "won" | "lost" }
export interface Pipeline { id: string; name: string; stages: Stage[] }
export interface FieldDef { key: string; label: string; type: FieldType; options?: string[]; pipelineId: string | null }
export interface Opportunity {
  id: string; title: string; contactId: string; pipelineId: string; stageId: string;
  value: number | null; ownerId: string; custom: Record<string, string | number | boolean | null>;
}
export interface Payment { id: string; opportunityId: string; contactId: string; amount: number; currency: string; status: "paid" | "pending" | "failed" | "expired" | "refunded"; ref: string; requestedBy: string; createdAt: string }
export interface Appointment { id: string; contactId: string; employeeId: string; title: string; start: string; end: string }
export interface Message { id: string; contactId: string; direction: "in" | "out"; text: string; at: string }
export interface Activity { id: string; contactId: string; opportunityId?: string; type: string; text: string; actor: string; at: string }
export interface Criteria { q?: string; ownerId?: string; tag?: string; status?: LeadStatus | ""; stageId?: string; createdAfter?: string }
export interface SavedList { id: string; name: string; criteria: Criteria }
export interface RecoveryItem { contact: Contact; reasons: string[] }
