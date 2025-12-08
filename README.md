# Protego InsurTech — My Insurance Site

Front-of-house and agent portal demo for auto insurance: online quote flow, renewal tool, and login experience. Source stays private; this README is for external description and internal bring-up.

## Highlights
- Quote wizard: address/driver/vehicle/coverage steps to generate auto quotes; supports new policy and renewal entry points.
- Agent renewal assistant: authenticated agents can use `/renewal` to help customers renew.
- Portal and auth: NextAuth sessions with redirects to login or dashboard when not authorized.
- UI/UX: Next.js App Router + Tailwind 4 with custom brand hero, gradients, CTAs, product cards, and value props.

## Tech Stack
- Next.js 15 (App Router), React 18, TypeScript
- Tailwind CSS 4
- Prisma + PostgreSQL (sample DB; point to your own connection)
- NextAuth for authentication; Nodemailer for email channel
- Axios, fast-xml-parser, js2xmlparser for data handling

## How to Showcase (without exposing code)
- Record or capture a demo; store under `public/demo/` or link externally (avoid sensitive data).
- For a public repo, keep only this README, product screenshots/GIFs, and optionally built static assets; keep source in a private repo.

## Run Locally (private environment)
1) Node 18+, install deps: `npm install`  
2) Create `.env` (example):
```
DATABASE_URL="postgresql://user:password@localhost:5432/insurance"
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
EMAIL_SERVER=smtp://user:pass@smtp.example.com:587
EMAIL_FROM="noreply@example.com"
```
3) Sync DB: `npx prisma db push`  
4) Start dev server: `npm run dev` → open http://localhost:3000  
5) To test auth flows, create user/agent accounts (via Prisma seed or manual DB insert).

## Directory Quick Tour
- `src/app`: pages and API routes (home, login, dashboard, quote wizard, renewal, api/auth, etc.)
- `src/components`: shared UI pieces (navbar, form steps, tables, CTAs)
- `prisma`: schema and Prisma client setup
- `public`: brand assets and static files
- `sql/`: sample insurance-related SQL/scripts
- `types` / `utils` / `lib`: form types, validation, Prisma/auth helpers

## Roadmap (for demo narrative)
- Expand product lines: Home, Auto + Home, Condo, Rental
- Richer agent tools: renewal recommendations, bulk import, notifications
- Monitoring and audit logging

If you need screenshot/GIF placeholders or a more detailed seed/login guide, let me know.
