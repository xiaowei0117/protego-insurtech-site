import { NextResponse } from "next/server";

type RetrievedChunk = {
  id: string;
  text: string;
  doc: string;
  page?: string;
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

    // TODO: replace with real retrieval (vector search/keyword) and LLM call
    const retrieved: RetrievedChunk[] = [
      {
        id: "chunk-1",
        doc: "Wellington_HO_TX_v2024.pdf",
        page: "12",
        text: "Eligible dwellings up to $750,000 Coverage A with wind mitigation documentation for TX coastal counties...",
      },
      {
        id: "chunk-2",
        doc: "Wellington_UW_Guide.pdf",
        page: "4",
        text: "Roof age must be under 15 years for wind coverage eligibility. Exceptions require underwriting approval...",
      },
    ];

    // Mock LLM-style structured answer
    const answerLabel = "Yes";
    const conditions =
      "Allowed with wind mitigation form; max Coverage A $750k; roof age < 15 years.";
    const sources = retrieved.slice(0, 2).map((r) => ({
      doc: r.doc,
      page: r.page ? `p.${r.page}` : "",
      snippet: r.text.slice(0, 160) + (r.text.length > 160 ? "..." : ""),
    }));

    return NextResponse.json({
      answer: answerLabel,
      conditions,
      sources,
      retrieved,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
