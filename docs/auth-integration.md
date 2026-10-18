# Authentication handoff
These pages provide forms, not completed authentication. No fake login or local token storage is used.

## Proposed same-origin API contract for Husain
- POST /api/auth/login: JSON { email, password }
- POST /api/auth/signup: JSON { fullName, workspaceName, email, password }
- Successful session: 200 JSON { authenticated: true }; server sets secure HttpOnly session cookies.
- Signup awaiting email confirmation: 200/201 JSON { requiresEmailConfirmation: true }.
- Failure: non-2xx JSON { error: "Safe message for the user" }.
- Success navigates to / (the existing dashboard).
If your backend uses another contract, update components/auth/AuthForm.tsx to match it.

Backend must validate input, enforce same-origin/CSRF protection and rate limits, create the workspace/Owner atomically, support confirmation callbacks, validate sessions, implement logout and reject cross-workspace access. Do not trust roles supplied by the client.
Replace the demo SessionProvider in lib/hooks.tsx and the demo role selector in Shell with server-derived identity/permissions. The auth page shell bypass is visual only and does not protect routes.
These pages intentionally do not modify lib/api.ts or Husain's Supabase helpers.

## Verify once backend is available
1. Create an account and verify workspace + Owner membership.
2. Confirm email when enabled, then log in; refresh retains session.
3. Wrong credentials show an error; timeout allows retry.
4. Mismatched passwords do not submit; repeated clicks do not duplicate requests.
5. Log out; protected pages/API reject unauthenticated requests.
6. A second workspace cannot read the first workspace's data.
