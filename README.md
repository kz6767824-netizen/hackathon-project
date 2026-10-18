# LeadGuard CRM — Yusha's frontend

Run: `npm install` then `npm run dev` → http://localhost:3000

## How to connect Husain's backend
Every screen calls functions in `lib/api.ts` ONLY. Each currently returns mock data
(`lib/mock.ts`). Replace each function body with a `fetch("/api/...")` that returns
the same shape (types in `lib/types.ts`). Nothing else changes.

The SERVER must enforce (the UI only displays the error): stage-required fields on move,
opted-out messaging block, value masking, role-aware dashboard, saved-list counts, dashboard preferences.

Kashif: replace `SessionProvider` in `lib/hooks.tsx` with real auth (role + permissions).
The "Viewing as" dropdown in the top bar is a demo-only role switch; delete it later.

## Screens
/ dashboard · /contacts (filters, saved lists, pagination) · /contacts/[id] (customer view)
/companies · /pipeline (drag board) · /opportunities/[id] (custom fields)
/recovery · /employees · /settings/fields · /settings/pipelines
