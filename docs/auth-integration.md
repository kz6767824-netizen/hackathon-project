# Authentication handoff

The login and signup pages provide forms that call the same-origin authentication API. Authentication and workspace membership are handled by the server using Supabase Auth.

## Environment variables

Set these in `.env.local` for local development and in the deployment environment for production:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`

Never commit `.env.local` or share its secret values.

## API contract

All endpoints return JSON. Errors use this format:

    {
      "error": "Readable message"
    }

### `POST /api/auth/signup`

Request:

    {
      "name": "Hussain",
      "workspaceName": "Example Company",
      "email": "hussain@example.com",
      "password": "a-secure-password"
    }

The server creates the Supabase Auth user, a workspace, and an Owner membership.

### `POST /api/auth/login`

Request:

    {
      "email": "hussain@example.com",
      "password": "a-secure-password"
    }

On success, the server sets an HTTP-only session cookie.

### `POST /api/auth/logout`

Clears the session cookie.

### `GET /api/me`

Returns the signed-in user and workspace membership. The response includes the user's ID, name, email, workspace ID, workspace name, workspace slug, and role.

If there is no valid session, the endpoint returns `401`.

## Frontend integration

- The forms should call the endpoints above and display the returned error message when a request fails.
- After successful signup or login, navigate to `/`.
- Replace the demo `SessionProvider` in `lib/hooks.tsx` with identity loaded from `GET /api/me`.
- Remove the demo role selector from `Shell`. The server is the source of truth for user identity and roles.
- The auth page shell bypass is visual only; it does not protect routes.

Check that `components/auth/AuthForm.tsx` sends `name` in the signup request. Do not trust roles or workspace IDs supplied by the browser.

## Security and workspace isolation

Protected API routes must validate the session on the server and enforce workspace isolation. The server must derive the user's role and workspace membership from trusted data, not client input.

## Verify when the app is running

1. Create an account and confirm the workspace and Owner membership were created.
2. Log in, refresh the page, and confirm the session persists.
3. Try incorrect credentials and confirm a readable error appears.
4. Confirm mismatched passwords do not submit and repeated clicks do not create duplicate requests.
5. Log out and confirm protected pages and APIs reject unauthenticated requests.
6. Confirm a user in one workspace cannot access another workspace's data.