# Protego InsurTech - My Insurance Site

Front-of-house and agent portal demo for insurance quoting and agent workflows, including an internal carrier assistant with retrieval-augmented generation (RAG). Source stays private; this README is for external description and internal bring-up.

## Highlights
- Quote wizard: address/driver/vehicle/coverage steps to generate auto quotes; supports new policy and renewal entry points.
- Agent tools: renewal workflow and carrier assistant under `/agent/*`.
- Carrier assistant (RAG): retrieves carrier guidelines from a vectorized document store with citations and debug view.
- Portal and auth: NextAuth sessions with redirects to login or dashboard when not authorized.
- UI/UX: Next.js App Router + Tailwind 4 with branded layout, CTA blocks, and product cards.

## Tech Stack
- Next.js 15 (App Router), React 18, TypeScript
- Tailwind CSS 4
- Prisma + PostgreSQL (pgvector for RAG)
- NextAuth for authentication; Nodemailer for email channel
- Axios, fast-xml-parser, js2xmlparser for data handling

## Directory Quick Tour
- `src/app`: pages and API routes (quote wizard, renewal, agent tools, carrier assistant)
- `src/components`: shared UI pieces (navbar, form steps, tables, CTAs)
- `scripts/ingest.ts`: document ingestion and embedding pipeline
- `prisma`: schema, migrations, and Prisma client setup
- `public`: brand assets and static files
- `sql/`: sample insurance-related SQL/scripts
- `types` / `utils` / `lib`: form types, validation, Prisma/auth helpers

## RAG Overview
- Documents are ingested from `DOCS_ROOT` and chunked with overlap.
- Embeddings are generated and stored in `Chunk.embedding` (pgvector).
- Queries embed the question and perform vector search + lightweight rerank.
- The assistant answers strictly from retrieved context with citations.

## Local Setup (RAG)
1) Configure `.env`:
   - `DATABASE_URL=...`
   - `DOCS_ROOT=...`
   - `OLLAMA_HOST=http://localhost:11434`
   - `EMBEDDING_MODEL=nomic-embed-text`
   - `LLM_MODEL=llama3.1:8b`
2) Ensure pgvector extension exists and migrations are applied.
3) Ingest documents: `npx ts-node scripts/ingest.ts`
4) Run dev server: `npm run dev`

## Roadmap (for demo narrative)
- Expand product lines: Home, Auto + Home, Condo, Rental
- Richer agent tools: renewal recommendations, bulk import, notifications
- Monitoring and audit logging
