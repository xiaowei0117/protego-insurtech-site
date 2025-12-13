"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type CachedQuote = {
  payload?: any;
  result?: {
    quotes?: Array<{
      id?: number;
      carrier?: string;
      carrier_name?: string | null;
      premium?: string | number | null;
      term?: string | null;
      deductible?: string | null;
    }>;
    premium?: string | number | null;
  };
};

type QuoteResult = {
  quotes?: Array<{
    id?: number;
    carrier?: string;
    carrier_name?: string | null;
    premium?: string | number | null;
    term?: string | null;
    deductible?: string | null;
  }>;
  premium?: string | number | null;
};

export default function ClientResult({ keyParam }: { keyParam: string }) {
  const router = useRouter();
  const [data, setData] = useState<QuoteResult | null>(null);
  const [payload, setPayload] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const resumeHref = (() => {
    const applicantId = payload?.applicantId;
    const xref = payload?.xrefKey;
    if (applicantId) {
      return `/new?applicantId=${encodeURIComponent(applicantId)}${xref ? `&xref=${encodeURIComponent(xref)}` : ""}`;
    }
    if (xref) return `/new?xref=${encodeURIComponent(xref)}`;
    return "/new?fresh=1";
  })();

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(keyParam);
      if (raw) {
        const parsed: CachedQuote = JSON.parse(raw);
        setData(parsed.result || null);
        setPayload(parsed.payload || null);
      }
    } catch {
      setData(null);
    }
  }, [keyParam]);

  if (!data) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Unable to display quote details. Please go back and try again.
      </div>
    );
  }

  const quotes = data.quotes || [];
  async function handleSave() {
    if (!payload) {
      setError("No quote payload to save. Please go back and re-run the quote.");
      return;
    }
    setSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const body = { ...payload, save: true };
      const res = await fetch("/api/quotes/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Failed to save quote");
      }
      setSaveMessage("Quote saved. You can view and edit it anytime.");
      setSaved(true);
      if (json?.quotes) {
        setData({ quotes: json.quotes, premium: json.premium });
      }
    } catch (e: any) {
      setError(e?.message || "Failed to save quote");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {!saved ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="font-semibold text-amber-900">Save the quote</div>
          <p className="mt-1">Save this quote so you can come back to view or edit it anytime.</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-[#1EC8C8] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#19b3b3] disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save quote"}
            </button>
          </div>
          {error && <div className="mt-2 text-sm text-red-700">{error}</div>}
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <div className="font-semibold text-green-900">{saveMessage || "Quote saved."}</div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/quotes")}
              className="rounded-lg bg-[#1EC8C8] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#19b3b3]"
            >
              My quotes
            </button>
          </div>
        </div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Quotes</h2>
          <Link
            href={resumeHref}
            className="rounded-lg bg-[#1EC8C8] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#19b3b3]"
          >
            Re-open &amp; Edit
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {quotes.map((q, idx) => (
            <div
              key={q.id ?? idx}
              className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800"
            >
              <div className="text-base font-semibold text-gray-900">
                {q.carrier_name || q.carrier || "Carrier"}
              </div>
              <div className="mt-1 text-lg font-bold text-gray-900">
                {q.premium ? `$${q.premium}` : "N/A"}
              </div>
              {q.term && <div className="text-xs text-gray-600">Term: {q.term}</div>}
              {q.deductible && <div className="text-xs text-gray-600">Deductible: {q.deductible}</div>}
            </div>
          ))}
          {!quotes.length && <div className="text-sm text-gray-600">No quote details available.</div>}
        </div>
      </section>
    </>
  );
}
