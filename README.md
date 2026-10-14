# Sidflix

Next.js (App Router, TypeScript, Tailwind CSS v4) with Better Auth, Drizzle ORM and Postgres on Neon.

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and fill in `DATABASE_URL` (from the Neon console) and `BETTER_AUTH_SECRET`.
3. Generate the Better Auth tables: `npm run auth:generate`, then uncomment the re-export in `src/db/schema.ts`.
4. Push the schema to Neon: `npm run db:push` (or `db:generate` + `db:migrate` for versioned migrations).
5. Start the dev server: `npm run dev`, then check `http://localhost:3000/api/auth/ok` returns `{"ok":true}`.

## Structure

| Path | Purpose |
|------|---------|
| `src/db/index.ts` | Drizzle client over the Neon serverless HTTP driver |
| `src/db/schema.ts` | Drizzle schema entry point |
| `src/lib/auth.ts` | Better Auth server instance (Drizzle adapter) |
| `src/lib/auth-client.ts` | Better Auth React client |
| `src/app/api/auth/[...all]/route.ts` | Better Auth route handler |
| `drizzle.config.ts` | drizzle-kit config (reads `.env.local`) |

## Scripts

| Script | Does |
|--------|------|
| `dev` / `build` / `start` / `lint` | Next.js defaults |
| `typecheck` | `tsc --noEmit` |
| `auth:generate` | Generate Better Auth Drizzle schema into `src/db/auth-schema.ts` |
| `db:generate` / `db:migrate` / `db:push` / `db:studio` | drizzle-kit |
