import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const FAISS_URL = process.env.FAISS_URL || "http://localhost:8000";
const EMB_MODEL = process.env.EMBEDDING_MODEL || "nomic-embed-text";
const LLM_MODEL = process.env.LLM_MODEL || "llama3.1:8b";
const TOP_K = Number(process.env.CARRIER_ASSISTANT_TOP_K || 5);
const FAISS_CANDIDATE_MULTIPLIER = Number(process.env.FAISS_CANDIDATE_MULTIPLIER || 5);
const RERANK_ALPHA = Number(process.env.CARRIER_ASSISTANT_RERANK_ALPHA || 0.02);

type RetrievedChunk = {
  id: string;
  text: string;
  doc: string;
  page?: string | null;
  score?: number;
};

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

function normalizeOptionalFilter(v?: string) {
  if (!v) return null;
  const s = v.trim();
  if (!s || s === "Select" || s === "Latest") return null;
  return s;
}

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

    const faissTopK = Math.max(TOP_K * FAISS_CANDIDATE_MULTIPLIER, TOP_K);
    const tRetrieve0 = Date.now();
    const searchRes = await fetch(`${FAISS_URL}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vector: queryEmbedding, top_k: faissTopK }),
    });
    if (!searchRes.ok) {
      const msg = await searchRes.text();
      throw new Error(`FAISS search failed: ${searchRes.status} ${msg}`);
    }
    const searchJson = await searchRes.json();
    const faissResults = (searchJson?.results || []) as Array<{ id: string; score: number }>;

    const faissIds = faissResults.map((r) => r.id);
    const scoreMap = new Map(faissResults.map((r) => [r.id, Number(r.score) || 0]));

    const programFilter = normalizeOptionalFilter(program);
    const versionFilter = normalizeOptionalFilter(version);

    const chunks = faissIds.length
      ? await prisma.chunk.findMany({
          where: {
            id: { in: faissIds },
            carrier,
            lob,
            state,
            ...(programFilter ? { program: programFilter } : {}),
            ...(versionFilter ? { version: versionFilter } : {}),
          },
          include: { doc: { select: { docName: true, sourcePath: true } } },
        })
      : [];

    const chunkMap = new Map(chunks.map((c) => [c.id, c]));
    const ordered = faissIds
      .map((id) => chunkMap.get(id))
      .filter((v): v is NonNullable<typeof v> => Boolean(v))
      .slice(0, faissTopK)
      .map((c) => ({
        id: c.id,
        docid: c.docId,
        docname: c.doc?.docName || null,
        sourcepath: c.doc?.sourcePath || null,
        carrier: c.carrier,
        lob: c.lob,
        state: c.state,
        program: c.program,
        version: c.version,
        page: c.page,
        chunk: c.chunk,
        score: scoreMap.get(c.id) || 0,
      }));
    const retrievalMs = Date.now() - tRetrieve0;

    console.log("[carrier-assistant-faiss] retrieved", ordered.length, {
      carrier,
      lob,
      state,
      program,
      version,
      topK: TOP_K,
      faissTopK,
    });

    const reranked = [...ordered]
      .sort((a, b) => {
        const aScore = a.score + RERANK_ALPHA * keywordOverlapScore(question, a.chunk);
        const bScore = b.score + RERANK_ALPHA * keywordOverlapScore(question, b.chunk);
        return bScore - aScore;
      })
      .slice(0, TOP_K);

    const context = reranked
      .map(
        (r, idx) =>
          `[#${idx + 1} ${r.docname || r.docid}${r.page ? ` p.${r.page}` : ""}] ${r.chunk}`
      )
      .join("\n\n");

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
    const answerLabel = /yes/i.test(llmContent) ? "Yes" : /no/i.test(llmContent) ? "No" : "Refer";

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

    console.log("[carrier-assistant-faiss] timing", {
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
