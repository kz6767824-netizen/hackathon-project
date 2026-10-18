# Supabase authentication setup

Login and signup use Supabase Auth with email/password. The browser client reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from `.env.local`; never use a service-role/secret key in the browser.

Signup stores `full_name` and `workspace_name` in the new auth user's metadata. The migration at `supabase/migrations/20261018150000_create_workspaces.sql` creates the workspace and its owner membership from that metadata, using a database trigger. Apply the migration in the Supabase SQL editor before accepting real signups.

In the Supabase dashboard:

1. Enable email/password under Authentication > Providers > Email.
2. Set the Site URL to `http://localhost:3000` for local development.
3. Add `http://localhost:3000` to the allowed redirect URLs.
4. Choose whether email confirmation is required.

If confirmation is enabled, the signup page tells the user to check their email; after confirmation they can log in. For deployment, add the production origin to the Site URL/redirect allow list.

This establishes authentication and workspace ownership at signup. The existing CRM data functions in `lib/api.ts` still use mock data, and application routes/API data access still need server-side authorization before production.
