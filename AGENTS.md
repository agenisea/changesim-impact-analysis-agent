# Repository Guidelines

## Project Structure & Module Organization
`app/` hosts the Next.js App Router pages, API routes, and server actions. Shared UI lives in `components/`, while reusable domain logic is split inside `lib/` (`lib/ai`, `lib/business`, `lib/db`, `lib/server`, `lib/client`). Static assets reside under `public/`, and environment provisioning lives in `database/supabase/`. Tests mirror the domain in `tests/` (api, business, components, db) with fixtures consolidated in `tests/fixtures/`.

## Build, Test, and Development Commands
Use `pnpm install` to set up dependencies. Local development runs through `pnpm dev`, while `pnpm build` produces the production bundle and `pnpm start` serves it. Run `pnpm lint` for ESLint, `pnpm format` or `pnpm format:check` for Prettier, and execute `pnpm test` or `pnpm test:watch` for the Vitest suite.

## Coding Style & Naming Conventions
TypeScript is required everywhere, with strict mode enforced by `tsconfig.json`. Prettier (default 2-space indentation, single quotes off) and `next lint` are the source of truth; run them before committing. Component files should stay in PascalCase, hooks in camelCase, and utilities in kebab-case filenames. Favor Tailwind utility classes; centralize compound class logic with helpers in `lib/client` or `tailwind-merge`.

## Testing Guidelines
Vitest powers unit and integration tests, with React Testing Library for components and Supabase stubs in `tests/db`. Keep tests colocated within the matching domain folder, naming files `*.test.ts` or `*.test.tsx`. Add new fixtures to `tests/fixtures/` and register shared setup in `tests/setup.ts`. Ensure meaningful coverage for risk logic and API orchestration before opening a PR.

## Commit & Pull Request Guidelines
Follow Conventional Commits (`feat:`, `fix:`, `chore:`) as seen in recent history. Composite changes belong in separate commits to simplify reviews. Pull requests should include a concise summary, screenshots or GIFs for UI work, linked issues, and a short "Testing" checklist (commands run, screenshots, or notes). Surface any Supabase schema updates or new env vars explicitly.

## Security & Configuration Tips
Store secrets (`OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`, `API_TOKEN`) in `.env.local` and never commit them. Update `fly.toml` and `nginx.conf` only when deployment changes are intentional, and call them out in the PR. When modifying database schemas, sync the SQL artifacts under `database/supabase/` and document migrations.
