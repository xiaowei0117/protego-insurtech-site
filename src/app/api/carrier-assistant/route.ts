import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const EMB_MODEL = process.env.EMBEDDING_MODEL || "nomic-embed-text"; // 768-dim default
const LLM_MODEL = process.env.LLM_MODEL || "llama3.1:8b";
const TOP_K = Number(process.env.CARRIER_ASSISTANT_TOP_K || 5);
const RERANK_ALPHA = Number(process.env.CARRIER_ASSISTANT_RERANK_ALPHA || 0.02);

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function keywordOverlapScore(query: string, doc: string) {
  const q = new Set(tokenize(query));
  if (!q.size) return 0;
  let hits = 0;
  for (const t of tokenize(doc)) {
    if (q.has(t)) hits += 1;
  }
  return hits;
}

type RetrievedChunk = {
  id: string;
  text: string;
  doc: string;
  page?: string | null;
  score?: number;
};

export async function POST(req: Request) {
  try {
    const t0 = Date.now();
    const body = await req.json();
    const {
      carrier,
      lob,
      state,
      program,
      version,
      question,
    }: {
      carrier: string;
      lob: string;
      state: string;
      program?: string;
      version?: string;
      question: string;
    } = body;

    if (!carrier || !lob || !state || !question) {
      return NextResponse.json(
        { error: "carrier, lob, state, question are required" },
        { status: 400 }
      );
    }

    // 1) Embed query via Ollama
    const tEmbed0 = Date.now();
    const embedRes = await fetch(`${OLLAMA_HOST}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: EMB_MODEL, prompt: question }),
    });
    if (!embedRes.ok) {
      const msg = await embedRes.text();
      throw new Error(`Embedding failed: ${embedRes.status} ${msg}`);
    }
    const embedJson = await embedRes.json();
    const queryEmbedding = embedJson?.embedding as number[];
    const embeddingMs = Date.now() - tEmbed0;

    // 2) Vector search with business filters
    const tRetrieve0 = Date.now();
    const retrieved = await prisma.$queryRaw<
      Array<{
        id: string;
        docid: string;
        docname: string | null;
        sourcepath: string | null;
        carrier: string;
        lob: string;
        state: string;
        program: string | null;
        version: string | null;
        page: string | null;
        chunk: string;
        score: number;
      }>
    >`
      SELECT
        c.id,
        c."docId" AS docid,
        d."docName" AS docname,
        d."sourcePath" AS sourcepath,
        c.carrier,
        c.lob,
        c.state,
        c.program,
        c.version,
        c.page,
        c.chunk,
        1 - (c.embedding <=> ${queryEmbedding}::vector) AS score
      FROM "Chunk" c
      JOIN "Document" d ON d.id = c."docId"
      WHERE c.carrier = ${carrier}
        AND c.lob = ${lob}
        AND c.state = ${state}
        -- Only filter program/version when explicitly provided (ignore empty/Select/Latest)
        AND (
          ${program} IS NULL
          OR ${program} = ''
          OR ${program} = 'Select'
          OR c.program = ${program}
        )
        AND (
          ${version} IS NULL
          OR ${version} = ''
          OR ${version} = 'Latest'
          OR c.version = ${version}
        )
      ORDER BY c.embedding <=> ${queryEmbedding}::vector
      LIMIT ${TOP_K};
    `;
    const retrievalMs = Date.now() - tRetrieve0;
    console.log("[carrier-assistant] retrieved", retrieved.length, {
      carrier,
      lob,
      state,
      program,
      version,
      topK: TOP_K,
    });

    // 3) Simple rerank: add keyword overlap to vector score
    const reranked = [...retrieved].sort((a, b) => {
      const aScore = a.score + RERANK_ALPHA * keywordOverlapScore(question, a.chunk);
      const bScore = b.score + RERANK_ALPHA * keywordOverlapScore(question, b.chunk);
      return bScore - aScore;
    });

    // 4) Build context for LLM
    const context = reranked
      .map(
        (r, idx) =>
          `[#${idx + 1} ${r.docname || r.docid}${r.page ? ` p.${r.page}` : ""}] ${r.chunk}`
      )
      .join("\n\n");

    // 5) Call LLM for structured answer
    const prompt = `
You are a carrier eligibility assistant. You must ONLY use facts explicitly present in the Context.
If the Context does not contain the answer, respond with "Refer" and explain that the information is not found.
Do not add or infer any details not in the Context. Keep wording close to the source text.

Question: ${question}

Context:
${context || "N/A"}

Respond with:
- Answer: Yes/No/Refer
- Conditions: bullet points copied or tightly paraphrased from Context only
- Include inline citations using [#n doc p.page] for every factual statement.
`.trim();

    // 4) Call Ollama LLM
    const tLlm0 = Date.now();
    const genRes = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: LLM_MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.2 },
      }),
    });
    if (!genRes.ok) {
      const msg = await genRes.text();
      throw new Error(`LLM failed: ${genRes.status} ${msg}`);
    }
    const genJson = await genRes.json();
    const llmContent = genJson?.response || "";
    const llmMs = Date.now() - tLlm0;
    const answerLabel = /\brefer\b/i.test(llmContent) ? "Refer" : /\byes\b/i.test(llmContent) ? "Yes" : /\bno\b/i.test(llmContent) ? "No" : "Refer";

    const sources = reranked.map((r, idx) => ({
      doc: r.docname || r.docid,
      page: r.page ? `p.${r.page}` : "",
      snippet: r.chunk.slice(0, 160) + (r.chunk.length > 160 ? "..." : ""),
      tag: `#${idx + 1}`,
    }));

    const retrievedForDebug: RetrievedChunk[] = reranked.map((r) => ({
      id: r.id,
      text: r.chunk,
      doc: r.docname || r.docid,
      page: r.page,
      score: r.score,
    }));

    console.log("[carrier-assistant] timing", {
      embedding_ms: embeddingMs,
      retrieval_ms: retrievalMs,
      llm_ms: llmMs,
      total_ms: Date.now() - t0,
    });
    return NextResponse.json({
      answer: answerLabel,
      conditions: llmContent,
      sources,
      retrieved: retrievedForDebug,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
