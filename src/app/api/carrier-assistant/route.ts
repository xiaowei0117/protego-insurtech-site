import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const EMB_MODEL = process.env.EMBEDDING_MODEL || "nomic-embed-text"; // 768-dim default
const LLM_MODEL = process.env.LLM_MODEL || "llama3.1:8b";
const TOP_K = Number(process.env.CARRIER_ASSISTANT_TOP_K || 5);

type RetrievedChunk = {
  id: string;
  text: string;
  doc: string;
  page?: string | null;
  score?: number;
};

export async function POST(req: Request) {
  try {
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

    // 2) Vector search with business filters
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
    console.log("[carrier-assistant] retrieved", retrieved.length, {
      carrier,
      lob,
      state,
      program,
      version,
      topK: TOP_K,
    });

    // 3) Build context for LLM
    const context = retrieved
      .map(
        (r, idx) =>
          `[#${idx + 1} ${r.docname || r.docid}${r.page ? ` p.${r.page}` : ""}] ${r.chunk}`
      )
      .join("\n\n");

    // 4) Call LLM for structured answer
    const prompt = `
You are a carrier eligibility assistant. Use the provided context to answer briefly.
Question: ${question}

Context:
${context || "N/A"}

Respond with:
- Answer: Yes/No/Refer
- Conditions: bullet points if applicable
- Include inline citations using [#n doc p.page] from the context when relevant.
`.trim();

    // 4) Call Ollama LLM
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
    const answerLabel = /yes/i.test(llmContent)
      ? "Yes"
      : /no/i.test(llmContent)
      ? "No"
      : "Refer";

    const sources = retrieved.map((r, idx) => ({
      doc: r.docname || r.docid,
      page: r.page ? `p.${r.page}` : "",
      snippet: r.chunk.slice(0, 160) + (r.chunk.length > 160 ? "..." : ""),
      tag: `#${idx + 1}`,
    }));

    const retrievedForDebug: RetrievedChunk[] = retrieved.map((r) => ({
      id: r.id,
      text: r.chunk,
      doc: r.docname || r.docid,
      page: r.page,
      score: r.score,
    }));

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
