# WNJO

The website and agency platform for WNJO: a marketing site with an instant quote journey, customer accounts, an agency admin area, and a tested foundation for an AI-assisted delivery workflow.

- **Live site:** https://www.wnjoweb.co.uk
- **Branch in development:** `claude/gallant-albattani-rjj387`. Production builds from `main`.
- **Original product brief:** [docs/PROJECT_BRIEF.md](docs/PROJECT_BRIEF.md)

## Stack
Next.js 16 (App Router) · React 19 · TypeScript · Supabase (PostgreSQL, Auth, Storage) · Resend (email) · Vercel · Vitest.

## Quick start
```bash
npm install
cp .env.example .env.local   # then fill in the values described in docs/ENVIRONMENT_VARIABLES.md
npm run dev                  # http://localhost:3000
```

## Scripts
| Command | Does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (no emit) |
| `npm test` | Unit tests (Vitest) |

The database tests in `supabase/tests/` run against the Supabase project, not locally. See [docs/TESTING.md](docs/TESTING.md).

## Project layout
```
src/app/            Pages and API routes (App Router)
src/components/     UI components; admin/ and account/ hold the signed-in screens
src/lib/            Business logic: pricing, quotes, enquiries, briefing, AI engine
src/lib/ai/         AI orchestration: provider, tools, policy, budgets, runner, events
supabase/migrations/  Database changes, applied in filename order
supabase/tests/     Database access and business-rule checks
docs/               Architecture, schema, security, testing, deployment, AI, status
```

## Key rules
- Prices are stored in integer pence and calculated on the server from the database catalogue.
- Quotes, quote acceptances and approval decisions are final. They are recorded by database functions and can't be edited afterwards.
- The owner's email address is never shown on the website.
- No AI agent is enabled, and no model is called, until a provider key is configured and an agent is switched on.
- Secrets live in Vercel or the credential store, never in the repository.

## Documentation
- [Architecture](docs/ARCHITECTURE.md)
- [API reference](docs/API.md)
- [Database schema](docs/DATABASE_SCHEMA.md)
- [Security](docs/SECURITY.md)
- [Testing](docs/TESTING.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Environment variables](docs/ENVIRONMENT_VARIABLES.md)
- [AI agents](docs/AI_AGENTS.md) and [AI permissions](docs/AI_PERMISSIONS.md)
- [Implementation status](docs/IMPLEMENTATION_STATUS.md)
