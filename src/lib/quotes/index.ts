import { QuoteSearchInput, QuoteSearchResult } from "@/../types/quotes";
import { requestQuotesMock } from "./providers/ezlynx-mock";

// In the future, import the real SDK/HTTP function here
// import { requestQuotesEZLynx } from "./providers/ezlynx-real";

const USE_MOCK = process.env.NEXT_PUBLIC_QUOTES_USE_MOCK !== "false";
// by default true; set NEXT_PUBLIC_QUOTES_USE_MOCK=false to use real API later

export async function requestQuotes(input: QuoteSearchInput): Promise<QuoteSearchResult> {
  if (USE_MOCK) {
    return requestQuotesMock(input);
  }
  // return requestQuotesEZLynx(input); // when you’re ready
  // For now, keep mock on if real isn’t implemented
  return requestQuotesMock(input);
}
