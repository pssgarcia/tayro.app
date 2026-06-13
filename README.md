# tayro

Influencer marketing platform for the fitness niche. Creators build a career; brands find the right fit — no spreadsheets, no Instagram DMs.

[![CI](https://github.com/pssgarcia/tayro.app/actions/workflows/ci.yml/badge.svg)](https://github.com/pssgarcia/tayro.app/actions/workflows/ci.yml)

## Stack

| Layer     | Technologies                                              |
|-----------|-----------------------------------------------------------|
| API       | NestJS · Prisma · PostgreSQL (Neon) · JWT                 |
| Web       | React 19 · Vite · Tailwind CSS · shadcn/ui · React Query  |
| Monorepo  | Turborepo · npm workspaces                                |
| CI/CD     | GitHub Actions → Railway (API) + Vercel (Web)             |
| Testing   | Jest (API) · Vitest + Testing Library (Web)               |

## Prerequisites

- Node ≥ 20
- npm ≥ 10

## Installation

```bash
git clone https://github.com/pssgarcia/tayro.app.git
cd tayro.app
npm install
```

## Environment variables

```bash
cp apps/api/.env.example apps/api/.env
# Fill in the variables below:
```

| Variable                | Description                                          |
|-------------------------|------------------------------------------------------|
| `DATABASE_URL`          | PostgreSQL connection string (Neon)                  |
| `JWT_ACCESS_SECRET`     | Secret used to sign access tokens                    |
| `JWT_ACCESS_EXPIRES_IN` | Access token expiry (e.g. `15m`)                     |
| `JWT_REFRESH_SECRET`    | Secret used to sign refresh tokens                   |
| `JWT_REFRESH_EXPIRES_IN`| Refresh token expiry (e.g. `7d`)                     |
| `ALLOWED_ORIGINS`       | CORS allowed origins (e.g. `http://localhost:5173`)  |
| `RAPIDAPI_KEY`          | RapidAPI key for Instagram data (optional in dev)    |
| `INSTAGRAM_PROVIDER`    | `stub` (dev) or `rapidapi` (prod)                    |

## Development

```bash
# API (port 3001) + Web (port 5173) in parallel
npm run dev
```

```bash
# API only
npm run dev --workspace=apps/api

# Web only
npm run dev --workspace=apps/web
```

## Database

```bash
cd apps/api

# Generate Prisma Client after schema changes
npx prisma generate

# Create a new migration (SQL only, does not apply)
npx prisma migrate dev --create-only --name migration_name

# Apply migrations to the database
npx prisma migrate deploy
```

> **Important:** Always use `migrate deploy` on Neon — never run `migrate dev` directly against the production database.

## Testing

```bash
# All tests (from root)
npm test

# API — Jest
npm test --workspace=apps/api

# API — watch mode
npm run test:watch --workspace=apps/api

# API — coverage
npm run test:cov --workspace=apps/api

# Web — Vitest
npm test --workspace=apps/web

# Web — watch mode
npm run test:watch --workspace=apps/web
```

## CI/CD

### Continuous Integration (CI)
Runs on **every push and PR**:
1. Lint (ESLint)
2. Typecheck (tsc --noEmit)
3. Unit tests
4. Production build

### Continuous Delivery (CD)
Runs **only when CI passes on the main branch**:
- API → Railway (automatic migration before deploy)
- Web → Vercel

#### Required GitHub Secrets

| Secret               | Used by              |
|----------------------|----------------------|
| `DATABASE_URL`       | CI + CD (migrations) |
| `RAILWAY_TOKEN`      | CD (API deploy)      |
| `VERCEL_TOKEN`       | CD (Web deploy)      |
| `VERCEL_ORG_ID`      | CD (Web deploy)      |
| `VERCEL_PROJECT_ID`  | CD (Web deploy)      |

## Architecture

```
tayro/
├── apps/
│   ├── api/                    # NestJS — Clean Architecture per module
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── auth/       # JWT (access + refresh) with rotation
│   │       │   ├── campaigns/  # Campaign/program CRUD
│   │       │   ├── applications/ # Applications + IG data review
│   │       │   ├── creators/   # Public profile + apply without account
│   │       │   └── instagram/  # Adapter (Stub dev / RapidAPI prod)
│   │       └── shared/         # Guards, Prisma service, utils
│   └── web/                    # React 19 + Vite
│       └── src/
│           ├── pages/
│           │   ├── brand/      # Brand dashboard (campaigns, applications)
│           │   ├── auth/       # Login
│           │   └── public/     # Public apply (no auth required)
│           ├── components/     # Design system (shadcn + primitives)
│           ├── stores/         # Zustand (auth)
│           ├── hooks/          # React Query (campaigns, applications)
│           └── utils/          # Formatting (currency, followers, engagement)
└── .github/
    └── workflows/
        ├── ci.yml              # Lint · Typecheck · Test · Build
        └── cd.yml              # Deploy (Railway + Vercel)
```

## Security

- Refresh token **rotation** — SHA-256 hash stored in DB, old token invalidated on every use
- Access token in **memory** (Zustand), never in localStorage
- Instagram handles sanitized on both sides (DTO + display)
- Rate limiting on auth endpoints
- `publicProfileEnabled = false` by default (LGPD compliance)
