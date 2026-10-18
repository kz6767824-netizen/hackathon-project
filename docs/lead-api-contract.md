# Lead intake and CRM API contract

Implementation proposal for Kashif, Yusha and Husain, grounded in current lib/types.ts and lib/api.ts on main. These endpoints are a contract to implement, not existing working backend APIs.

## 1. Enquiry input
POST /api/public/forms/:formToken/enquiries
Content-Type: application/json
Idempotency-Key: client-generated UUID, reused for a retry of the same submission.

JSON:
{
  "name": "Ahmed Ali",
  "email": "ahmed@example.com",
  "phone": "+923001234567",
  "message": "I would like a solar installation quote."
}

Require trimmed name and message; require at least one valid contact channel (email or phone). Suggested limits: name 100, email 254, phone 30, message 2000 characters. Normalize phones; reject malformed input. Public callers cannot choose ownerId, workspaceId, role, source, acknowledgement state or opportunity value.
Manual intake: POST /api/leads with authenticated session; same fields plus optional companyId and tags, authorized and validated within the workspace. Source is manual on server.
Inbound provider messages call the same internal createLead service; source is message, derived from the verified provider connection, not customer input.
An enquiry does not automatically establish a sale amount or opportunity.

## 2. Workspace resolution
Authenticated APIs: validate session, resolve active workspace membership on the server, then check operation permission. A supplied active-workspace selector must always be membership-checked.
Public form: formToken resolves to an enabled intake-form record with workspace_id. It is a routing identifier, not an admin secret; expose only a write-only, validated, rate-limited intake route. No public customer-list access.
Messaging: verify webhook authenticity and resolve the workspace from the stored provider connection/destination.
Every record and query is workspace-scoped, with RLS/foreign-key integrity where appropriate. Never trust client owner/role/workspace fields.

## 3. Creation response
Public success: 201 { "enquiryId": "<uuid>", "received": true }
Do not expose employee information, existing contact details or internal assignment state publicly.
Authorized manual creation: 201 { "lead": Lead, "contact": ContactRecord }.
Repeat submission with identical idempotency key and payload returns the original result, no new records. Reusing a key with different payload returns 409.
Errors: 400 invalid input, 401 missing session on protected routes, 403 insufficient permission, 404 missing/inaccessible target, 409 conflict, 429 rate limit; JSON { "error": "Safe human-readable explanation", "fieldErrors": { } }.

Proposed Lead shape:
{
 "id": "<uuid>", "contactId": "<uuid>", "source": "web_form",
 "message": "...", "ownerId": "<workspace-member-id>",
 "status": "new", "createdAt": "<UTC ISO8601>",
 "firstAssignedAt": "<UTC ISO8601>", "assignedAt": "<UTC ISO8601>",
 "ackDeadline": "<UTC ISO8601 or null>", "acknowledgedAt": null,
 "lastTouch": "<UTC ISO8601>", "escalations": 0
}
source: web_form | manual | message.
ownerId identifies a workspace employee/membership, not an email. Seed/configure an accountable Owner/manager fallback before enabling intake. If all employees are unavailable or at capacity, retain the lead under that accountable fallback and show the capacity problem in recovery; do not silently drop it or allocate as normal round-robin to unavailable staff.

## 4. Status and roles
Base roles (case-sensitive, matching UI): Owner | Admin | User.
Manager is a permission set, not a fourth base role. Server checks explicit permissions including CRM view/create/edit/delete/export, value visibility, assignment settings, integration management and audit access.
Employee availability must become: available | busy | on_leave | offline.
Current UI has available | away | offline: replace away throughout types, fixtures, selects and API together. Do not conflate busy and on_leave.
Lead statuses currently in UI: new | acknowledged | escalated | open.
Recommended meaning:
- new: assigned, awaiting first acknowledgement.
- escalated: reassigned automatically after timeout, awaiting acknowledgement.
- acknowledged: employee has accepted or taken a qualifying recorded action.
- open: legacy UI value; stop emitting for new records, migrate existing legacy data explicitly.
Acknowledgement clears current ackDeadline but retains all assignment/escalation history.
Sales progression is opportunity.stageId; won/lost belong to pipeline stages, not these acknowledgement statuses.
Open-lead workload should mean active/not-closed leads INCLUDING acknowledged leads. Add closedAt for closure if needed; do not infer closure merely from acknowledgement.
Keep firstAssignedAt unchanged during reassignment. First response time = first acknowledgement - firstAssignedAt.
Use conditional updates/transactions so a stale worker cannot escalate an acknowledged or reassigned lead.

## 5. Frontend data shapes and adapters
Current Contact in lib/types.ts includes lead fields (status, ackDeadline, ownerId, escalations). For backend storage keep contacts and leads separate: one person may submit multiple enquiries. Update the lead UI to use lead.id; do not acknowledge by contact ID if several leads exist.

Preserve these existing CRM function return shapes in lib/api.ts where possible:
- listContacts(criteria,page,pageSize): { items: Contact[], total: number }
- getContact(id): { contact, company, owner, opportunities, payments, appointments, messages, activity }
- getCompanies(): Company records with contacts count
- getCompany(id): { company, contacts }
- getPipelines(): Pipeline[] with id/name/stages, each stage id/name/requiredFields/kind
- getFieldDefs(): FieldDef[] with key/label/type/options/pipelineId
- listOpportunities(pipelineId): Opportunity[] plus contactName
- getOpportunity(id): { opportunity, pipeline, contact, fields, payments, activity }
- getEmployees(): { id,name,role,status,openLeads }[]
- getRecovery(): current { contact,reasons }[] must gain lead.id or become { lead,contact,reasons }[] before real acknowledgement/reassignment.
- Dashboard: same displayed figures but server-calculated and permission-filtered, no hard-coded response time.
For CRM contact summary compatibility, explicitly choose a deterministic active lead (e.g. most recently created active lead), include its leadId, and return the complete leads array on contact detail. Do not collapse multiple enquiries silently.
ContactRecord: id/name/phone/email/companyId/tags/optedOut/createdAt; lead-owned fields live on Lead.
Use camelCase at API boundary to fit TypeScript; database may use snake_case.
Dates are UTC ISO8601; display in employee timezone. Paginate lists. Return hidden opportunity values as null or omit, and exclude them from exports and aggregates for unauthorized users.
Extend Message with delivery status/provider reference/error and Appointment with opportunity/provider reference/status as integrations are added.

## 6. Coordination
Husain owns schema/RLS/API/assignment services. Yusha owns CRM screens/types and their adapters in lib/api.ts in coordination with Husain. Kashif owns enquiry/auth UI and notifications/deployment.
Existing SessionProvider and role selector are demo state; replace with server-authenticated identity and permissions.
Authentication forms are already on feat/kashif-auth. Reuse docs/auth-integration.md from that branch; do not rebuild duplicate forms.
After merge: each teammate commits local work, fetches, and merges origin/main into their feature branch. Keep .env.local untracked; each laptop and Vercel need explicit environment setup.
