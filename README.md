# ERDify

ERDify is a TypeScript monorepo for a web-based ERD editor.

## Stack

- Turborepo
- React + Vite
- NestJS
- TypeORM + PostgreSQL
- LDS `@lawkit/ui`
- TanStack Query, Axios, Zustand, vanilla-extract

## Local Commands

```powershell
pnpm install
pnpm verify:workspace
pnpm verify:configs
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Apps

- `apps/web`: React/Vite frontend
- `apps/api`: NestJS backend

## Packages

- `packages/domain`: canonical ERD document model
- `packages/contracts`: API contract schemas
- `packages/db`: TypeORM config and migrations
- `packages/erd-ui`: ERD-specific UI primitives
