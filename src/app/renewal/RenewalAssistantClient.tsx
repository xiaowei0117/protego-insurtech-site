"use client";

import { useState } from "react";

type AgentInfo = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type AnalysisResult = {
  premium_old: number;
  premium_new: number;
  premium_change: number;
  coverage_changes: string[];
  email_draft: string;
};

type Props = {
  agent: AgentInfo;
};

export default function RenewalAssistantClient({ agent }: Props) {
  // Local state for files
  const [oldPolicy, setOldPolicy] = useState<File | null>(null);
  const [newPolicy, setNewPolicy] = useState<File | null>(null);

  // Local state for result
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!oldPolicy || !newPolicy) {
      setErrorMsg("Please upload both old and new policy declaration pages.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("oldPolicy", oldPolicy);
      formData.append("newPolicy", newPolicy);

      // You could also include agent info for auditing / saving later
      formData.append("agentEmail", agent.email);
      formData.append("agentId", agent.id);

      // Call Next.js API route, which talks to FastAPI
      const res = await fetch("/api/renewal-analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Analysis failed");
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
    <main className="min-h-screen bg-gray-50 flex items-start justify-center p-8">
      <div className="w-full max-w-xl rounded-xl bg-white border border-gray-200 shadow p-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-gray-900">
            Renewal Assistant
          </h1>

          <p className="text-sm text-gray-600 leading-relaxed">
            Upload last term (old) and renewal (new) declaration pages. We will
            analyze premium changes, coverage changes, and generate a renewal
            explanation email draft you can send to the customer.
          </p>

          {/* Agent identity / context */}
          <div className="text-xs text-gray-500 mt-2 leading-relaxed">
            <div>Signed in as: <span className="font-medium text-gray-700">{agent.name || agent.email}</span></div>
            <div>Role: <span className="font-medium text-gray-700">{agent.role}</span></div>
          </div>
        </div>

        {/* Upload form */}
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Old policy declaration (expiring / last term)
            </label>
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setOldPolicy(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-white hover:file:bg-blue-700"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              PDF or a clear photo is fine.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New / renewal policy declaration
            </label>
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setNewPolicy(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-white hover:file:bg-blue-700"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Renewal offer dec page.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 text-white text-sm font-medium px-4 py-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Analyzing..." : "Generate email draft"}
          </button>
        </form>

        {/* Errors */}
        {errorMsg && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="mt-6 space-y-6">
            {/* Premium summary */}
            <section className="border rounded-lg p-4 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">
                Premium Summary
              </h2>
              <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                Last term premium: ${result.premium_old}
                <br />
                Renewal premium: ${result.premium_new}
                <br />
                Change:{" "}
                {result.premium_change >= 0
                  ? `+${result.premium_change}`
                  : result.premium_change}
              </p>
            </section>

            {/* Coverage changes */}
            <section className="border rounded-lg p-4 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">
                Coverage changes
              </h2>
              {result.coverage_changes.length === 0 ? (
                <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                  No major coverage changes detected.
                </p>
              ) : (
                <ul className="list-disc pl-5 text-sm text-gray-700 mt-2 leading-relaxed">
                  {result.coverage_changes.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              )}
            </section>

            {/* Email draft */}
            <section className="border rounded-lg p-4 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">
                Email draft to customer
              </h2>

              <textarea
                className="w-full h-48 text-sm text-gray-800 border border-gray-300 rounded-lg p-3 leading-relaxed"
                value={personalizeEmailDraft(result.email_draft, agent)}
                readOnly
              />

              <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
                You can copy this message and send it to the insured. Edit
                names, tone, and details as needed.
              </p>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

/**
 * Optionally inject the agent signature into the generated draft.
 * For example replace "[Your Name]" in the draft with the agent's real name.
 */
function personalizeEmailDraft(draft: string, agent: AgentInfo): string {
  let output = draft;

  if (agent.name) {
    output = output.replace("[Your Name]", agent.name);
  } else {
    // fallback to email
    output = output.replace("[Your Name]", agent.email || "your agent");
  }

  return output;
}
