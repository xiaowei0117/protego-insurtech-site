import path from "node:path";
import fs from "node:fs/promises";
import { QuoteSearchInput, QuoteSearchResult, QuoteCarrierResult } from "@/../types/quotes";

export async function requestQuotesMock(input: QuoteSearchInput): Promise<QuoteSearchResult> {
  // You can log or inspect input here if you want
  const mockPath = path.join(process.cwd(), "data", "mock_quote_response.json");
  const raw = await fs.readFile(mockPath, "utf-8");
  const parsed = JSON.parse(raw);

  // Map your mock JSON structure → QuoteSearchResult
  // Adjust mapping to your actual mock file structure.
  const carriers: QuoteCarrierResult[] = (parsed.carriers ?? []).map((c: any) => ({
    carrierId: String(c.id ?? c.carrierId ?? ""),
    carrierName: String(c.name ?? c.carrierName ?? "Unknown Carrier"),
    monthlyPremium: Number(c.monthlyPremium ?? c.premiumMonthly ?? 0),
    termPremium: Number(c.termPremium ?? c.premiumTerm ?? 0),
    termMonths: Number(c.termMonths ?? 6),
    productName: c.productName ?? c.program ?? undefined,
    ratingTier: c.ratingTier ?? undefined,
    coverages: (c.coverages ?? []).map((cv: any) => ({
      name: String(cv.name ?? cv.type ?? "Coverage"),
      limit: cv.limit ? String(cv.limit) : undefined,
      deductible: cv.deductible ? String(cv.deductible) : undefined,
    })),
    discounts: c.discounts ?? [],
    underwritingNotes: c.uwNotes ?? c.notes ?? [],
  }));

  return {
    requestId: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
    carriers,
  };
}
