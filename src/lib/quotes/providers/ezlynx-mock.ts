import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import type { QuoteSearchInput, QuoteSearchResult, QuoteCarrierResult } from "../../../..//types/quotes"; // root /types

// If you moved quotes.ts to src/types, use:
// import type { QuoteSearchInput, QuoteSearchResult, QuoteCarrierResult } from "@/types/quotes";

export async function requestQuotesMock(input: QuoteSearchInput): Promise<QuoteSearchResult> {
  const mockPath = path.join(process.cwd(), "data", "mock_quote_response.json");

  let parsed: any;
  try {
    const raw = await fs.readFile(mockPath, "utf-8");
    parsed = JSON.parse(raw);
  } catch (err: any) {
    console.error("[MOCK] Failed to read mock file:", mockPath, err?.message);
    // Safe fallback so you can still test the UI even if the file is missing
    return {
      requestId: randomUUID(),
      receivedAt: new Date().toISOString(),
      carriers: demoCarriers(),
    };
  }

  // Try multiple common shapes for carriers
  const rawCarriers: any[] =
    parsed?.carriers ??
    parsed?.results ??
    parsed?.data?.carriers ??
    parsed?.quotes ??
    [];

  let carriers: QuoteCarrierResult[] = [];
  try {
    carriers = rawCarriers.map((c: any) => ({
      carrierId: String(c.id ?? c.carrierId ?? c.code ?? randomUUID()),
      carrierName: String(c.name ?? c.carrierName ?? "Unknown Carrier"),
      monthlyPremium: Number(c.monthlyPremium ?? c.premiumMonthly ?? c.monthly ?? 0),
      termPremium: Number(c.termPremium ?? c.premiumTerm ?? c.total ?? 0),
      termMonths: Number(c.termMonths ?? c.term ?? 6),
      productName: c.productName ?? c.program ?? undefined,
      ratingTier: c.ratingTier ?? c.tier ?? undefined,
      coverages: Array.isArray(c.coverages)
        ? c.coverages.map((cv: any) => ({
            name: String(cv.name ?? cv.type ?? "Coverage"),
            limit: cv.limit ? String(cv.limit) : undefined,
            deductible: cv.deductible ? String(cv.deductible) : undefined,
          }))
        : [],
      discounts: Array.isArray(c.discounts) ? c.discounts : [],
      underwritingNotes: Array.isArray(c.uwNotes ?? c.notes) ? (c.uwNotes ?? c.notes) : [],
    }));
  } catch (e: any) {
    console.error("[MOCK] Mapping error:", e?.message);
  }

  // If mapping produced none, provide a demo set so UI still works
  if (!carriers.length) {
    console.warn("[MOCK] No carriers found in mock JSON; returning demo carriers.");
    carriers = demoCarriers();
  }

  return {
    requestId: randomUUID(),
    receivedAt: new Date().toISOString(),
    carriers,
  };
}

function demoCarriers(): QuoteCarrierResult[] {
  return [
    {
      carrierId: "demo-1",
      carrierName: "Tomato Mutual",
      monthlyPremium: 118,
      termPremium: 708,
      termMonths: 6,
      productName: "Standard",
      ratingTier: "Preferred",
      coverages: [{ name: "Liability", limit: "100/300", deductible: "-" }],
      discounts: ["Multi-policy", "Telematics"],
      underwritingNotes: [],
    },
    {
      carrierId: "demo-2",
      carrierName: "Potato Casualty",
      monthlyPremium: 127,
      termPremium: 762,
      termMonths: 6,
      productName: "Plus",
      ratingTier: "Standard",
      coverages: [{ name: "Comp/Coll", deductible: "$500" }],
      discounts: ["Good driver"],
      underwritingNotes: [],
    },
  ];
}
