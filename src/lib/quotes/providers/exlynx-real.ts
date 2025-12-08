import { QuoteSearchInput, QuoteSearchResult } from "@/../types/quotes";

export async function requestQuotesEZLynx(input: QuoteSearchInput): Promise<QuoteSearchResult> {
  // 1) Build payload per EZLynx spec
  // 2) Sign / authenticate (OAuth / API key, etc.)
  // 3) Fetch and map to QuoteSearchResult
  // 4) Return same shape as mock

  // Example structure (replace with real calls):
  /*
  const token = await getEzToken();
  const res = await fetch(EZ_BASE_URL + "/quotes", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(transformInputToEZ(input)),
  });
  const data = await res.json();
  return mapEZResponseToUnified(data);
  */
  throw new Error("EZLynx real provider not implemented yet");
}
