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
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

async function callOllama(prompt: string): Promise<string> {
  const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: LLM_MODEL,
      prompt,
      stream: false,
      options: { temperature: 0.2 },
    }),
  });
  if (!res.ok) throw new Error(`Ollama failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data?.response || "";
}

async function callGemini(prompt: string, apiVersion = "v1beta"): Promise<Response> {
  return fetch(
    `https://generativelanguage.googleapis.com/${apiVersion}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
      }),
    }
  );
}

async function callLLM(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) return callOllama(prompt);

  try {
    // Try v1beta first, fall back to v1 if 404
    let res = await callGemini(prompt, "v1beta");
    if (res.status === 404) {
      console.warn("[callLLM] v1beta 404 — retrying with v1 endpoint");
      res = await callGemini(prompt, "v1");
    }

    // On rate limit, wait 5s and retry once
    if (res.status === 429) {
      console.warn("[callLLM] Gemini 429 — retrying in 5s...");
      await new Promise((r) => setTimeout(r, 5000));
      res = await callGemini(prompt, "v1beta");
    }

    if (!res.ok) {
      const errBody = await res.text();
      console.warn(`[callLLM] Gemini error ${res.status} (model: ${GEMINI_MODEL}) — ${errBody.slice(0, 200)}`);
      return callOllama(prompt);
    }

    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (err) {
    console.warn("[callLLM] Gemini exception — falling back to Ollama:", err);
    return callOllama(prompt);
  }
}

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
You are a knowledgeable insurance agent helping a colleague understand carrier guidelines.
Use ONLY the facts in the Context below. Do not invent or assume anything not stated.
If the Context does not contain enough information, respond with "Refer" and explain what is missing.

Question: ${question}

Context:
${context || "N/A"}

Instructions:
- Start with "Answer: Yes", "Answer: No", or "Answer: Refer" on the first line.
- Then write a clear, organized explanation using plain English.
- Group related points under short section headers when helpful (e.g. "When it is covered:", "When it is NOT covered:", "Conditions:").
- Use "- " for each bullet point. Do not use "*".
- After each factual statement, add a citation in the format [#n] referencing the context source.
- Keep each bullet to one clear idea.
- Do not repeat the same point twice.
`.trim();

    const tLlm0 = Date.now();
    const llmContent = await callLLM(prompt);
    const llmMs = Date.now() - tLlm0;
    console.log(`[carrier-assistant-faiss] LLM backend: ${GEMINI_API_KEY ? `Gemini (${GEMINI_MODEL})` : `Ollama (${LLM_MODEL})`}`);
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
