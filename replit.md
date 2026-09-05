# Vikas Shiksha Sadan School Management

An admin-first school operations portal for Vikas Shiksha Sadan Senior Secondary School.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/vikas-school-portal/src/App.tsx` — responsive React application shell and route-level experiences.
- `artifacts/vikas-school-portal/src/index.css` — school-office visual language, typography, and motion tokens.
- `artifacts/api-server/src/routes/school.ts` — school API routes with seeded development data and CRUD mutations.
- `lib/api-spec/openapi.yaml` — source of truth for generated API hooks and validation schemas.

## Architecture decisions

- The first build uses the existing shared Express API service so the portal is runnable inside the workspace's managed preview.
- API contracts are defined in OpenAPI first and generated into the shared React client and Zod validation packages.
- The frontend is organized as an admin-first operations hub with route-level modules for students, teachers, academics, calendar, and notices.
- Clerk provides sign-in/sign-up; API access is role-aware, with student accounts restricted to their own profile and principal accounts able to manage the full register.

## Product

The portal provides a dashboard, student records with Nursery–XII class and section filters, class totals, homeroom-teacher assignments, and daily attendance registers. It also includes teacher contacts and specializations, academic resources and online lectures, a school calendar for holidays/occasions/sports, and a publishable notice board. Student accounts have protected self-service profiles; principals can add/remove students and see private contacts; assigned class teachers can take attendance for their sections.

## User preferences

The requested product name is Vikas Shiksha Sadan Senior Secondary School.

## Gotchas

- Numeric OpenAPI fields use `type: number` for compatibility with the workspace's current Zod runtime; regenerating integer schemas produces unsupported `z.int()` calls here.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
