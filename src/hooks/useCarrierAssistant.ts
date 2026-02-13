import { useState } from "react";

export type Source = { doc: string; page: string; snippet: string; tag?: string };
export type Retrieved = { id: string; text: string; score?: number; doc?: string; page?: string | null };

type AskPayload = {
  carrier: string;
  lob: string;
  state: string;
  program?: string;
  version?: string;
  question: string;
};

export function useCarrierAssistant(endpoint = "/api/carrier-assistant") {
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [conditions, setConditions] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [retrieved, setRetrieved] = useState<Retrieved[]>([]);

  async function ask(payload: AskPayload) {
    if (!payload.question.trim()) return;
    setLoading(true);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        throw new Error(msg?.error || "Request failed");
      }

      const data = await res.json();
      setAnswer(data.answer || null);
      setConditions(data.conditions || null);
      setSources(data.sources || []);
      setRetrieved(data.retrieved || []);
    } catch (err: any) {
      setAnswer("Refer");
      setConditions(err?.message || "Unable to fetch answer. Please try again.");
      setSources([]);
      setRetrieved([]);
    } finally {
      setLoading(false);
    }
  }

  return {
    ask,
    loading,
    answer,
    conditions,
    sources,
    retrieved,
  };
}
