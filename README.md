# Todo List (Supabase + React)

## Overview

A simple Todo List application with email/password authentication.

- Backend: Supabase (PostgreSQL + Auth) + Supabase Edge Function (Deno/TypeScript)
- Frontend: React 18 + Vite + TypeScript
- UI: Tailwind CSS + shadcn/ui
- Routing: React Router DOM
- Server state: TanStack React Query
- Forms/validation: React Hook Form + Zod

## Features

- Email/password signup + login (Supabase Auth)
- Todos CRUD
- Row Level Security (RLS): users can only access their own todos
- Kanban-style UI: Pending / Completed columns
- Optimistic updates when moving/deleting tasks (rollback on API failure)

## Project Structure

- `frontend/`: React app
- `supabase/`: Supabase local config, migrations, and Edge Function
  - `supabase/migrations/0001_todos.sql`: DB schema + RLS policies
  - `supabase/functions/api/index.ts`: Edge Function (Todos API)

## Requirements

- Node.js (recommended: latest LTS)
- Package manager: npm/yarn/pnpm (this repo uses `yarn.lock`)
- Supabase CLI (you can use the local npm-installed CLI via `npx supabase`)

## Environment Variables

### Frontend

Create `frontend/.env` (or copy from `frontend/.env.example`):

- `VITE_SUPABASE_URL`: your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: your Supabase anon key
- `VITE_API_BASE_URL`: base URL used by the frontend API client

For hosted Supabase, this is typically the same as the project URL:

- `VITE_API_BASE_URL=https://<project-ref>.supabase.co`

For local Supabase, use:

- `VITE_API_BASE_URL=http://localhost:54321`

### Edge Function (Supabase)

The Edge Function expects these secrets at runtime:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

When running locally via Supabase CLI, these are usually provided automatically.
For hosted deployment, set them via Supabase secrets.

## Run Locally

### 1) Install dependencies

From repository root:

- `yarn install`

### 2) Start Supabase locally

From repository root:

- `npx supabase start`

If you need to re-apply migrations from scratch:

- `npx supabase db reset`

### 3) Serve the frontend

From `frontend/`:

- `yarn dev`

Then open the Vite URL (usually `http://localhost:5173`).

## Database / RLS

Schema and RLS policies are defined in:

- `supabase/migrations/0001_todos.sql`

RLS ensures:

- Users can only select/insert/update/delete rows where `todos.user_id = auth.uid()`.

## Todos API (Edge Function)

The frontend calls the Edge Function at:

- `POST   /functions/v1/api/todos`
- `GET    /functions/v1/api/todos`
- `PATCH  /functions/v1/api/todos/:id`
- `DELETE /functions/v1/api/todos/:id`

On the function side, Supabase routes it internally under `/api/...`.

Notes:

- Requires the user to be authenticated.
- The function reads the `Authorization` header and uses `supabase.auth.getUser()` to verify the session.

## Deploy (hosted Supabase)

1) Link your project

- `npx supabase link --project-ref <project-ref>`

2) Push migrations

- `npx supabase db push`

3) Deploy the Edge Function

- `npx supabase functions deploy api`

4) Set Edge Function secrets (if needed)

- `npx supabase secrets set SUPABASE_URL=... SUPABASE_ANON_KEY=...`

## OpenAPI Documentation

The backend API includes **auto-generated OpenAPI documentation** using:

- **Hono** + **@hono/zod-openapi** for schema-driven route definitions

### Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /functions/v1/api/openapi.json` | OpenAPI 3.0 spec (JSON) |

### Usage

For hosted Supabase:

- Spec: `https://<project-ref>.supabase.co/functions/v1/api/openapi.json`

For local Supabase:

- Spec: `http://localhost:54321/functions/v1/api/openapi.json`
- Docs: `http://localhost:54321/functions/v1/api/docs`

## Cross-check vs Problem.md

- Supabase ✅
- PostgreSQL ✅
- Auth (email/password) ✅
- RLS ✅
- Edge Function ✅
- React 18 + Vite + TS ✅
- Tailwind + shadcn/ui ✅
- React Router ✅
- React Query ✅
- React Hook Form + Zod ✅
- OpenAPI generated docs ✅
