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
const FAISS_URL = process.env.FAISS_URL || "";
const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 120;
const require = createRequire(import.meta.url);
const argv = process.argv.slice(2);
const carrierFilter = (() => {
  const direct = argv.find((a) => a.startsWith("--carrier="));
  if (direct) return direct.split("=").slice(1).join("=") || "";
  const idx = argv.indexOf("--carrier");
  if (idx >= 0) return argv[idx + 1] || "";
  return "";
})();
const forceReingest = argv.includes("--force");

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

async function addToFaiss(vectors: number[][], ids: string[]) {
  if (!FAISS_URL || vectors.length === 0) return;
  const res = await fetch(`${FAISS_URL}/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vectors, ids }),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`FAISS add failed: ${res.status} ${msg}`);
  }
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

function fileHash(filePath: string) {
  const buf = readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function ingestFile(filePath: string) {
  // Expect folder layout: DOCS_ROOT/carrier/lob/state/version/filename.*
  const rel = path.relative(DOCS_ROOT, filePath);
  const parts = rel.split(path.sep);
  const [carrier = "Unknown", lob = "Unknown", state = "Unknown", version = "Unknown"] = parts;
  const docName = parts.at(-1) || path.basename(filePath);

  const hash = fileHash(filePath);
  const existingDocs = await prisma.document.findMany({
    where: { sourcePath: filePath },
    select: { id: true, meta: true },
  });
  if (existingDocs.length) {
    const hasSameHash = existingDocs.some((doc) => {
      const meta = doc.meta as any;
      return meta && typeof meta === "object" && meta.hash === hash;
    });
    if (hasSameHash && !forceReingest) {
      console.log(`Skip unchanged ${docName}`);
      return;
    }
    await prisma.document.deleteMany({ where: { sourcePath: filePath } });
  }

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
      meta: { hash },
    },
  });

  const embeddings = await Promise.all(chunks.map((c) => embed(c)));
  const chunkIds = chunks.map(() => crypto.randomUUID());

  // Insert chunks via raw SQL to support pgvector column
  await prisma.$transaction(
    chunks.map((chunkText, idx) => {
      const embedding = embeddings[idx] as number[];
      const vectorLiteral = `[${embedding.join(",")}]`;
      const programVal = null; // no program in path; adjust if you add one
      return prisma.$executeRawUnsafe(
        `INSERT INTO "Chunk" ("id","docId","carrier","lob","state","program","version","page","chunk","embedding","createdAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::vector,$11)`,
        chunkIds[idx],
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
  await addToFaiss(embeddings as number[][], chunkIds);

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
  const filtered = carrierFilter
    ? files.filter((f) => {
        const rel = path.relative(DOCS_ROOT, f);
        const parts = rel.split(path.sep);
        const carrier = parts[0] || "";
        return carrier.toLowerCase() === carrierFilter.toLowerCase();
      })
    : files;
  if (!filtered.length) {
    const msg = carrierFilter
      ? `No .txt or .pdf files found for carrier "${carrierFilter}" under ${DOCS_ROOT}`
      : `No .txt or .pdf files found under ${DOCS_ROOT}`;
    console.warn(msg);
    return;
  }

  if (carrierFilter) {
    console.log(`Carrier filter: ${carrierFilter}`);
  }
  if (forceReingest) {
    console.log("Force re-ingest enabled");
  }

  for (const file of filtered) {
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
