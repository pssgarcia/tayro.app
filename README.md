# tayro

Plataforma de marketing de influência para o nicho fitness. Criadores constroem carreira; marcas encontram o fit certo — sem planilha, sem DM no Instagram.

[![CI](https://github.com/pssgarcia/tayro.app/actions/workflows/ci.yml/badge.svg)](https://github.com/pssgarcia/tayro.app/actions/workflows/ci.yml)

## Stack

| Camada    | Tecnologias                                               |
|-----------|-----------------------------------------------------------|
| API       | NestJS · Prisma · PostgreSQL (Neon) · JWT                 |
| Web       | React 19 · Vite · Tailwind CSS · shadcn/ui · React Query  |
| Monorepo  | Turborepo · npm workspaces                                |
| CI/CD     | GitHub Actions → Railway (API) + Vercel (Web)             |
| Testes    | Jest (API) · Vitest + Testing Library (Web)               |

## Pré-requisitos

- Node ≥ 20
- npm ≥ 10

## Instalação

```bash
git clone https://github.com/pedrosoares/tayro.git
cd tayro
npm install
```

## Variáveis de ambiente

```bash
cp apps/api/.env.example apps/api/.env
# Preencha as variáveis abaixo:
```

| Variável                | Descrição                                   |
|-------------------------|---------------------------------------------|
| `DATABASE_URL`          | Connection string PostgreSQL (Neon)         |
| `JWT_ACCESS_SECRET`     | Segredo para assinar access tokens          |
| `JWT_ACCESS_EXPIRES_IN` | Validade do access token (ex: `15m`)        |
| `JWT_REFRESH_SECRET`    | Segredo para assinar refresh tokens         |
| `JWT_REFRESH_EXPIRES_IN`| Validade do refresh token (ex: `7d`)        |
| `ALLOWED_ORIGINS`       | Origins permitidos no CORS (ex: `http://localhost:5173`) |
| `RAPIDAPI_KEY`          | Chave RapidAPI para dados de Instagram (opcional em dev) |
| `INSTAGRAM_PROVIDER`    | `stub` (dev) ou `rapidapi` (prod)           |

## Desenvolvimento

```bash
# API (porta 3001) + Web (porta 5173) em paralelo
npm run dev
```

```bash
# Só a API
npm run dev --workspace=apps/api

# Só o Web
npm run dev --workspace=apps/web
```

## Banco de dados

```bash
cd apps/api

# Gerar Prisma Client após mudanças no schema
npx prisma generate

# Criar nova migration (só o SQL, sem aplicar)
npx prisma migrate dev --create-only --name nome_da_migration

# Aplicar migrations no banco
npx prisma migrate deploy
```

> **Atenção:** Use sempre `migrate deploy` no Neon — nunca `migrate dev` diretamente no banco de produção.

## Testes

```bash
# Todos os testes (raiz)
npm test

# API — Jest
npm test --workspace=apps/api

# API — modo watch
npm run test:watch --workspace=apps/api

# API — coverage
npm run test:cov --workspace=apps/api

# Web — Vitest
npm test --workspace=apps/web

# Web — modo watch
npm run test:watch --workspace=apps/web
```

## CI/CD

### Integração Contínua (CI)
Roda em **cada push e PR**:
1. Lint (ESLint)
2. Typecheck (tsc --noEmit)
3. Testes unitários
4. Build de produção

### Entrega Contínua (CD)
Roda **apenas quando o CI passa na branch main**:
- API → Railway (migration automática antes do deploy)
- Web → Vercel

#### Secrets necessários no GitHub

| Secret               | Onde usar       |
|----------------------|-----------------|
| `DATABASE_URL`       | CI + CD (migrations) |
| `RAILWAY_TOKEN`      | CD (deploy API) |
| `VERCEL_TOKEN`       | CD (deploy Web) |
| `VERCEL_ORG_ID`      | CD (deploy Web) |
| `VERCEL_PROJECT_ID`  | CD (deploy Web) |

## Arquitetura

```
tayro/
├── apps/
│   ├── api/                    # NestJS — Clean Architecture
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── auth/       # JWT (access + refresh) com rotation
│   │       │   ├── campaigns/  # CRUD de campanhas/programas
│   │       │   ├── applications/ # Candidaturas + revisão de dados IG
│   │       │   ├── creators/   # Perfil público + apply sem conta
│   │       │   └── instagram/  # Adapter (Stub dev / RapidAPI prod)
│   │       └── shared/         # Guards, Prisma service, utils
│   └── web/                    # React 19 + Vite
│       └── src/
│           ├── pages/
│           │   ├── brand/      # Dashboard da marca (campanhas, candidaturas)
│           │   ├── auth/       # Login
│           │   └── public/     # Apply público (sem auth)
│           ├── components/     # Design system (shadcn + primitivos)
│           ├── stores/         # Zustand (auth)
│           ├── hooks/          # React Query (campanhas, candidaturas)
│           └── utils/          # Formatação (moeda, seguidores, engajamento)
└── .github/
    └── workflows/
        ├── ci.yml              # Lint · Typecheck · Test · Build
        └── cd.yml              # Deploy (Railway + Vercel)
```

## Segurança

- Refresh token com **rotation** — hash SHA-256 no banco, token antigo invalidado a cada uso
- Access token em **memória** (Zustand), nunca em localStorage
- Handles de Instagram sanitizados nos dois lados (DTO + display)
- Rate limiting em endpoints de auth
- `publicProfileEnabled = false` por padrão (LGPD)
