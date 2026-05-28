# NovaDev

A browser-based AI-powered local development platform combining IDE, container management, deployment pipelines, metrics monitoring, Git operations, terminal sessions, and local AI model management.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/ide run dev` — run the IDE frontend (port 18624)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — express-session secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Monaco Editor, react-resizable-panels, TanStack Query, Recharts
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle ORM schema definitions (workspaces, files, conversations, messages, deployments, containers, terminal_sessions)
- `artifacts/api-server/src/routes/` — Express route handlers (workspaces, files, ai, deployments, containers, metrics, git, terminal)
- `artifacts/ide/src/pages/` — Frontend pages (Dashboard, IDE, Deployments, Containers, Models, Metrics, Git, Settings)
- `artifacts/ide/src/components/` — Shared UI components

## Architecture decisions

- Contract-first API design: OpenAPI spec drives Zod schema and React Query hook generation via Orval — never write fetch calls by hand.
- Zod body schemas use entity-shaped names (e.g. `CreateWorkspaceBody`) not operation-shaped to avoid TS2308 collisions in codegen output.
- Query parameters removed from 3 endpoints (listFiles, getContainerLogs, getGitLog) to prevent Orval type collisions.
- API server runs at `/api` path prefix; the shared reverse proxy routes by path so the IDE frontend uses relative URLs.
- Monaco Editor peer dep `monaco-editor` is satisfied implicitly by `@monaco-editor/react` in Vite — no separate install needed.

## Product

NovaDev is a full-featured local-first development platform with:
- **Workspaces** — manage multiple dev environments with language/status tracking
- **IDE** — Monaco-based editor with file tree, terminal, and AI chat sidebar
- **Deployments** — track builds and releases across environments (dev/staging/prod)
- **Containers** — Docker container lifecycle management with CPU/memory metrics
- **Local Models** — Ollama-compatible AI model management
- **Metrics** — Real-time CPU, memory, request rate monitoring per workspace
- **Git** — Branch, commit log, diff, and status views
- **Settings** — Platform configuration

## Gotchas

- Always restart the api-server workflow after adding new routes (esbuild bundles on start).
- Run `pnpm --filter @workspace/api-spec run codegen` after changing `openapi.yaml` before editing frontend code that uses generated hooks.
- The API server port is 8080 (not 5000); access via proxy at `localhost:80/api/...` for curl testing.
- Seed data inserts: run once or use `ON CONFLICT DO NOTHING` to avoid duplicate rows.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
