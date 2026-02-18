/**
 * populate-faiss.ts
 * -----------------
 * Loads all chunk embeddings from PostgreSQL into the FAISS service.
 * Run this every time the FAISS service restarts (it is in-memory only).
 *
 * Usage:
 *   npx ts-node scripts/populate-faiss.ts
 *
 * Optional flags:
 *   --reset   Wipe FAISS index before loading (default: false)
 *   --batch   Batch size for /add requests (default: 100)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FAISS_URL = process.env.FAISS_URL || "http://localhost:8000";
const BATCH_SIZE = Number(process.argv.find(a => a.startsWith("--batch="))?.split("=")[1] || 100);
const RESET = process.argv.includes("--reset");

async function main() {
  console.log(`[populate-faiss] FAISS_URL=${FAISS_URL}`);

  // 1) Optionally reset
  if (RESET) {
    const res = await fetch(`${FAISS_URL}/reset`, { method: "POST" });
    const data = await res.json();
    console.log(`[populate-faiss] Reset: total=${data.total}`);
  }

  // 2) Check current FAISS state
  const statsRes = await fetch(`${FAISS_URL}/stats`);
  const stats = await statsRes.json();
  console.log(`[populate-faiss] FAISS before load: total=${stats.total}, dim=${stats.dimension}`);

  // 3) Count total chunks in DB
  const total = await prisma.chunk.count();
  console.log(`[populate-faiss] Total chunks in DB: ${total}`);
  if (total === 0) {
    console.log("[populate-faiss] No chunks found. Run the ingest script first.");
    return;
  }

  // 4) Load chunks in batches
  let loaded = 0;
  let skip = 0;

  while (skip < total) {
    const batch = await prisma.$queryRaw<
      Array<{ id: string; embedding: number[] | null }>
    >`
      SELECT id, embedding::text as embedding
      FROM "Chunk"
      WHERE embedding IS NOT NULL
      ORDER BY "createdAt"
      LIMIT ${BATCH_SIZE} OFFSET ${skip}
    `;

    if (batch.length === 0) break;

    // Parse embeddings — pgvector returns as string "[0.1,0.2,...]"
    const vectors: number[][] = [];
    const ids: string[] = [];

    for (const row of batch) {
      if (!row.embedding) continue;
      const raw = typeof row.embedding === "string" ? row.embedding : JSON.stringify(row.embedding);
      const vec = raw
        .replace(/[\[\]]/g, "")
        .split(",")
        .map(Number);
      if (vec.length !== stats.dimension) {
        console.warn(`[populate-faiss] Skipping chunk ${row.id}: dim=${vec.length} expected ${stats.dimension}`);
        continue;
      }
      vectors.push(vec);
      ids.push(row.id);
    }

    if (vectors.length > 0) {
      const addRes = await fetch(`${FAISS_URL}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vectors, ids }),
      });
      const addData = await addRes.json();
      if (addData.error) {
        console.error(`[populate-faiss] Batch error:`, addData.error);
      } else {
        loaded += addData.count;
        console.log(`[populate-faiss] Loaded ${loaded}/${total} chunks (FAISS total=${addData.total})`);
      }
    }

    skip += BATCH_SIZE;
  }

  // 5) Final stats
  const finalStats = await fetch(`${FAISS_URL}/stats`).then(r => r.json());
  console.log(`\n[populate-faiss] Done. FAISS total=${finalStats.total} vectors loaded.`);

  if (finalStats.total < loaded) {
    console.warn("[populate-faiss] Warning: FAISS total is less than expected. Some chunks may have been skipped.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
