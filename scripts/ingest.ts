import "dotenv/config";
import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { createRequire } from "module";
import crypto from "crypto";

// Basic ingest script: read local docs, chunk, embed, and write to Document/Chunk tables.
const prisma = new PrismaClient();

const DOCS_ROOT = process.env.DOCS_ROOT || "";
const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const EMB_MODEL = process.env.EMBEDDING_MODEL || "nomic-embed-text"; // 768-dim for nomic-embed-text
const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 120;
const require = createRequire(import.meta.url);

function walkFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    const stat = statSync(p);
    if (stat.isDirectory()) return walkFiles(p);
    return [p];
  });
}

function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + size));
    i += size - overlap;
  }
  return chunks;
}

async function embed(text: string) {
  const res = await fetch(`${OLLAMA_HOST}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMB_MODEL, prompt: text }),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Ollama embed failed: ${res.status} ${msg}`);
  }
  const data = await res.json();
  return data?.embedding as number[];
}

async function readDoc(filePath: string): Promise<string> {
  if (filePath.toLowerCase().endsWith(".pdf")) {
    // pdf-parse v1.x default export is a function; v2 may export class.
    const pdfModule: any = require("pdf-parse");
    const pdfParse: any =
      typeof pdfModule === "function"
        ? pdfModule
        : typeof pdfModule.default === "function"
        ? pdfModule.default
        : null;
    if (!pdfParse) throw new Error("Failed to load pdf-parse");
    const parsed = await pdfParse(readFileSync(filePath));
    return parsed?.text || "";
  }
  return readFileSync(filePath, "utf8");
}

async function ingestFile(filePath: string) {
  // Expect folder layout: DOCS_ROOT/carrier/lob/state/version/filename.*
  const rel = path.relative(DOCS_ROOT, filePath);
  const parts = rel.split(path.sep);
  const [carrier = "Unknown", lob = "Unknown", state = "Unknown", version = "Unknown"] = parts;
  const docName = parts.at(-1) || path.basename(filePath);

  const content = await readDoc(filePath);
  const chunks = chunkText(content);
  if (!chunks.length) return;

  const doc = await prisma.document.create({
    data: {
      carrier,
      lob,
      state,
      version,
      docName,
      sourcePath: filePath,
    },
  });

  const embeddings = await Promise.all(chunks.map((c) => embed(c)));

  // Insert chunks via raw SQL to support pgvector column
  await prisma.$transaction(
    chunks.map((chunkText, idx) => {
      const embedding = embeddings[idx] as number[];
      const vectorLiteral = `[${embedding.join(",")}]`;
      const programVal = null; // no program in path; adjust if you add one
      return prisma.$executeRawUnsafe(
        `INSERT INTO "Chunk" ("id","docId","carrier","lob","state","program","version","page","chunk","embedding","createdAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::vector,$11)`,
        crypto.randomUUID(),
        doc.id,
        carrier,
        lob,
        state,
        programVal,
        version || null,
        String(idx + 1),
        chunkText,
        vectorLiteral,
        new Date()
      );
    })
  );

  console.log(`Ingested ${docName}: ${chunks.length} chunks`);
}

async function main() {
  if (!DOCS_ROOT) {
    throw new Error("DOCS_ROOT is not set in .env");
  }
  const files = walkFiles(DOCS_ROOT).filter((f) => {
    const lower = f.toLowerCase();
    return lower.endsWith(".txt") || lower.endsWith(".pdf");
  });
  if (!files.length) {
    console.warn(`No .txt or .pdf files found under ${DOCS_ROOT}`);
    return;
  }

  for (const file of files) {
    await ingestFile(file);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
