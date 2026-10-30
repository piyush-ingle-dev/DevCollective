n# Clerk + Supabase setup

DevCollective now uses:

- Clerk for authentication, sessions, password recovery, Google and GitHub sign-in.
- Supabase PostgreSQL for DevCollective application profiles.
- Supabase Storage remains available for file storage.
- Express remains the backend and verifies Clerk sessions before protected API work.

## 1. Install dependencies

After pulling the branch:

```bash
npm install
```

This regenerates `package-lock.json` from the updated `package.json`.

## 2. Configure Clerk

Create/configure a Clerk application and enable the authentication methods you want to offer, including email/password, Google, and GitHub.

Set:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

The publishable key is safe for the browser. Never put `CLERK_SECRET_KEY` in a `VITE_` variable or client code.

## 3. Configure Supabase

Set the project URL and server secret key:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

The secret key is server-only.

## 4. Create the profile table

Open the Supabase SQL Editor and run `supabase_clerk_migration.sql`.

The migration creates `public.devcollective_profiles` instead of altering the old Supabase-Auth tables, so the existing schema is not destructively changed.

## 5. Optional direct Supabase/RLS integration

If the browser will query Supabase directly in future features, activate Clerk as a Supabase Third-Party Auth provider and keep the RLS policies in the migration. The current profile API uses the server-side Supabase secret key after Clerk authentication has already been verified.

## 6. Run

```bash
npm run dev
```

Then create your first Clerk user. DevCollective will automatically provision the matching profile row in Supabase on first authenticated request.
