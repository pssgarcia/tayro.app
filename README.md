# tayro

Plataforma de marketing de influência fitness, creator-first: creators constroem carreira, marcas encontram o fit certo, sem planilha e sem DM de Instagram.

[![CI](https://github.com/pssgarcia/tayro.app/actions/workflows/ci.yml/badge.svg)](https://github.com/pssgarcia/tayro.app/actions/workflows/ci.yml)

- Web: https://tayro.app.br (domínio próprio, também em https://tayro-app.vercel.app)
- API: https://api-production-a813.up.railway.app/api/v1

## O que já funciona

- **Candidatura sem conta prévia**: a creator se candidata pelo link público, a conta (CLAIMABLE) nasce junto e ela define a senha depois, por e-mail.
- **Media kit vivo**: perfil da creator sincroniza com o Instagram real (seguidores, engajamento calculado, posts recentes), sem PDF nem print desatualizado.
- **Oferta definida antes da candidatura**: valor, tipo (dinheiro, produto ou desconto) e prazo visíveis pra todo mundo antes de se candidatar.
- **Fila de decisão**: aprovar ou recusar candidatura com o Instagram real do lado do botão, no desktop e no mobile (revisão em formato Story).
- **Ciclo completo da parceria**: recompensa (Pendente → Emitida → Entregue), conteúdo (envio + revisão) e resultado (a marca informa alcance, impressões e cupons; o número vira histórico visível pra creator e, se ela liberar, aparece no perfil público dela).
- **Creators aprovadas, cross-campanha**: lista consolidada de quem já foi aprovada em qualquer campanha, com contato direto via WhatsApp.
- **Conta**: troca de senha e de e-mail logada, recuperação de senha por e-mail e claim de conta.

## Stack

| Camada    | Tecnologias                                                        |
|-----------|---------------------------------------------------------------------|
| API       | NestJS · Prisma · PostgreSQL (Neon em prod) · JWT (access + refresh com rotação) |
| Web       | React 19 · Vite · React Router · Zustand · TanStack Query · Tailwind CSS · shadcn/ui |
| Monorepo  | Turborepo · npm workspaces                                          |
| CI/CD     | GitHub Actions → Railway (API) + Vercel (Web)                       |
| Testing   | Jest (API) · Vitest + Testing Library (Web)                         |

## Arquitetura

Monorepo (Turborepo + npm workspaces) com API e Web separados, cada um com sua própria suíte de testes e pipeline de CI.

```
tayro/
├── apps/
│   ├── api/                     # NestJS, Clean Architecture por módulo
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── auth/        # JWT (access + refresh) com rotação, claim de conta, troca/recuperação de senha e e-mail
│   │       │   ├── campaigns/   # Campanhas (máquina de estados DRAFT→ACTIVE→CLOSED→COMPLETED)
│   │       │   ├── applications/ # Candidaturas + revisão de conteúdo do Instagram
│   │       │   ├── brands/      # Perfil e dados da marca
│   │       │   ├── creators/    # Perfil público da creator, apply sem conta, creators aprovadas cross-campanha
│   │       │   ├── content/     # Envio e aprovação de conteúdo (submissions)
│   │       │   ├── rewards/     # Recompensas (PENDING→ISSUED→DELIVERED)
│   │       │   ├── partnerships/ # Resultado da parceria: histórico da creator, transparência bilateral
│   │       │   ├── dashboard/   # Agregações do dashboard (marca e creator)
│   │       │   ├── instagram/   # Adapter (Stub em dev / RapidAPI em prod, trocável via DI) + validação de handle
│   │       │   └── email/       # Adapter (Stub em dev / Resend em prod, trocável via DI)
│   │       └── shared/          # Guards, Prisma service, config, utils
│   └── web/                     # React 19 + Vite
│       └── src/
│           ├── pages/
│           │   ├── brand/       # Dashboard, campanhas, fila de candidaturas, creators aprovadas, perfil
│           │   ├── influencer/  # Dashboard, campanhas, candidaturas, conteúdo, recompensas, perfil
│           │   ├── auth/        # Login, cadastro, claim de conta, recuperação de senha
│           │   └── public/      # Landing, vitrine e apply sem login (/programs, /apply/:id, /c/:handle)
│           ├── components/      # Design system (Kinetic Editorial + primitives)
│           ├── stores/          # Zustand (auth)
│           ├── hooks/           # React Query (campanhas, candidaturas, etc.)
│           └── utils/           # Formatação (moeda, data, oferta)
└── .github/
    └── workflows/                # CI (lint, typecheck, test, build) e CD (deploy)
```

Integrações externas (Instagram, e-mail) são isoladas atrás de uma interface e injeção de dependência: trocar o provider (por exemplo, stub determinístico em dev, provider real em produção) não exige tocar em nenhum módulo consumidor.

## Segurança

- Refresh token com **rotação** (hash SHA-256 no banco, token antigo invalidado a cada uso)
- Access token em **memória** (Zustand), nunca em `localStorage`/`sessionStorage`
- CORS com allow-list explícita; API recusa subir em produção sem isso configurado
- Rate limiting dedicado em `/auth/*`
- `@MaxLength()` em todo campo de texto livre dos DTOs (defesa contra payload spam/DoS)
- Guards em toda rota autenticada; rota pública é sempre explícita
- Toda operação check-then-act (por exemplo, aprovar candidatura) roda em transação, sem race condition
- Troca de senha e de e-mail exigem a senha atual e reemitem a sessão, derrubando qualquer outro dispositivo logado
- Recuperação de senha por e-mail nunca revela se o endereço existe (resposta genérica, sempre a mesma)
- Perfil público da creator é opt-in (`publicProfileEnabled = false` por padrão, pensando em LGPD)
- Erros de infraestrutura (Prisma, chamadas externas) nunca vazam stack trace pro cliente

## Rodando localmente

Requer Node ≥ 20, npm ≥ 10 e um Postgres (local via Docker, ou uma instância própria).

```bash
git clone https://github.com/pssgarcia/tayro.app.git
cd tayro.app
npm install

# banco local (opcional, pode apontar DATABASE_URL pro seu próprio Postgres)
docker compose -f docker/docker-compose.yml up -d

# variáveis de ambiente da API: ver comentários no próprio arquivo
cp apps/api/.env.example apps/api/.env

cd apps/api
npx prisma generate
npx prisma migrate deploy
cd ../..

npm run dev
```

API em `:3001`, Web em `:5173` (a Web não precisa de variáveis de ambiente próprias: o Vite já faz proxy de `/api` pra API local).

## Testes

```bash
npm test                          # tudo
npm test --workspace=apps/api     # só a API
npm test --workspace=apps/web     # só a Web
```
