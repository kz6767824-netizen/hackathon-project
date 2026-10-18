# Leads API

This API supports public website enquiries and authenticated lead access. Dates are ISO 8601 strings, and IDs are strings.

## Public enquiry

### `POST /api/leads`

No login is required. The request must identify the target workspace using its slug.

Request:

    {
      "workspaceSlug": "example-company",
      "name": "Jordan Lee",
      "email": "jordan@example.com",
      "phone": "+1-555-0100",
      "message": "Please contact me about your services."
    }

A name and at least one contact method (email or phone) are required. The server sets the source to `website`; clients cannot choose a different source.

Success response: `201 Created`

    {
      "id": "lead-id",
      "status": "new",
      "createdAt": "2026-10-18T10:30:00.000Z"
    }

Errors use a readable JSON message:

    {
      "error": "Readable message"
    }

## Authenticated leads

Requests to read or create leads for a workspace require a valid session. The server derives the user's workspace from that session and must not trust a workspace ID or role supplied by the client.

The current `GET /api/leads` endpoint returns leads for the signed-in user's workspace. Unauthenticated requests return `401`.

## Lead fields

The lead screen should display:

- Lead ID
- Contact name
- Email or phone
- Message
- Source
- Status
- Creation time

New leads start with status `new`. Assignment and response deadlines can be added later.

## Workspace isolation

Every authenticated lead query must be scoped to the signed-in user's workspace. A user in one workspace must not be able to read or modify another workspace's leads.

## Implementation note

The public enquiry flow should be checked against `app/api/leads/route.ts` before the frontend form is connected. Its request fields must match the implemented route exactly.