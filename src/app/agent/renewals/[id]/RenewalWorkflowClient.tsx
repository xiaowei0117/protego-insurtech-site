"use client";

import { useState } from "react";
import type { RenewalPolicy } from "../mockRenewals";

type ComparisonResult = {
  oldVsRenewal: string[];
  renewalVsOtherQuotes: string[];
  emailDraft: string;
};

type Props = {
  policy: RenewalPolicy;
};

export default function RenewalWorkflowClient({ policy }: Props) {
  const [oldPolicy, setOldPolicy] = useState<File | null>(null);
  const [renewalPolicy, setRenewalPolicy] = useState<File | null>(null);
  const [otherQuotes, setOtherQuotes] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setResult(null);

    if (!oldPolicy || !renewalPolicy) {
      setErrorMsg("Please upload both prior-term and renewal documents.");
      return;
    }

    const formData = new FormData();
    formData.append("oldPolicy", oldPolicy);
    formData.append("renewalPolicy", renewalPolicy);
    otherQuotes.forEach((file) => formData.append("otherQuotes", file));

    formData.append("policyNumber", policy.policyNumber);
    formData.append("itemNumber", policy.itemNumber);
    formData.append("firstName", policy.firstName);
    formData.append("lastName", policy.lastName);
    formData.append("expirationDate", policy.expirationDate);
    formData.append("lineOfBusiness", policy.lineOfBusiness);
    formData.append("writingCarrier", policy.writingCarrier);
    formData.append("policyPremium", policy.policyPremium.toString());

    setLoading(true);
    try {
      const res = await fetch("/api/renewal-compare", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Comparison failed.");
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Upload Renewal Documents</h2>
        <p className="mt-1 text-sm text-gray-600">
          Compare prior-term and renewal documents, plus other carrier quotes.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prior term declaration (expiring policy)
            </label>
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setOldPolicy(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer file:mr-4 file:rounded-lg file:border-0 file:bg-[#1EC8C8] file:px-4 file:py-2 file:text-white hover:file:bg-[#19b3b3]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Renewal offer declaration
            </label>
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setRenewalPolicy(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer file:mr-4 file:rounded-lg file:border-0 file:bg-[#1EC8C8] file:px-4 file:py-2 file:text-white hover:file:bg-[#19b3b3]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Other quotes (optional)
            </label>
            <input
              type="file"
              accept="application/pdf,image/*"
              multiple
              onChange={(e) => setOtherQuotes(Array.from(e.target.files || []))}
              className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer file:mr-4 file:rounded-lg file:border-0 file:bg-gray-800 file:px-4 file:py-2 file:text-white hover:file:bg-gray-900"
            />
            <p className="mt-1 text-xs text-gray-500">
              Upload any competing quotes to compare with the renewal offer.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[#1EC8C8] text-white text-sm font-semibold px-4 py-2 hover:bg-[#19b3b3] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Analyzing..." : "Run comparison"}
          </button>
        </form>

        {errorMsg && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Analysis Results</h2>
        <p className="mt-1 text-sm text-gray-600">
          Summary of document differences and recommended customer email.
        </p>

        {!result && (
          <div className="mt-6 text-sm text-gray-500">
            Upload documents to generate comparisons and a draft email.
          </div>
        )}

        {result && (
          <div className="mt-6 space-y-6">
            <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-900">Old vs Renewal</h3>
              <ul className="mt-2 list-disc pl-5 text-sm text-gray-700 leading-relaxed">
                {result.oldVsRenewal.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-900">Renewal vs Other Quotes</h3>
              {result.renewalVsOtherQuotes.length ? (
                <ul className="mt-2 list-disc pl-5 text-sm text-gray-700 leading-relaxed">
                  {result.renewalVsOtherQuotes.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-gray-700">
                  No competing quotes uploaded yet.
                </p>
              )}
            </section>

            <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-900">Customer Email Draft</h3>
              <textarea
                className="mt-3 h-48 w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-800 leading-relaxed"
                value={result.emailDraft}
                readOnly
              />
              <p className="mt-2 text-[11px] text-gray-500 leading-relaxed">
                Edit tone or details before sending.
              </p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
