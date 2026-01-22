"use client";

import { useMemo, useState } from "react";
import { useCarrierAssistant } from "@/hooks/useCarrierAssistant";

const carriers = ["Wellington", "Carrier A", "Carrier B"];
const lobs = ["HO", "DF", "Wind"];
const states = ["TX", "FL", "CA"];
const programs = ["STD", "SEL", "Coastal"];
const versions = ["Latest", "2025-01-01", "2024-10-01"];

export default function CarrierAssistantPage() {
  const [carrier, setCarrier] = useState(carriers[0]);
  const [lob, setLob] = useState(lobs[0]);
  const [stateVal, setStateVal] = useState(states[0]);
  const [program, setProgram] = useState<string | "">("");
  const [version, setVersion] = useState(versions[0]);
  const [question, setQuestion] = useState("");
  const { ask, loading, answer, conditions, sources, retrieved } = useCarrierAssistant();
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [feedbackReason, setFeedbackReason] = useState<string>("");

  const hasResult = useMemo(() => Boolean(answer), [answer]);

  async function handleAsk() {
    if (!question.trim()) return;
    setFeedback(null);
    setFeedbackReason("");

    await ask({
      carrier,
      lob,
      state: stateVal,
      program,
      version,
      question,
    });
  }

  function handleFeedback(vote: "up" | "down") {
    setFeedback(vote);
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10 text-gray-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-teal-700">Agent Tools</p>
            <h1 className="text-2xl font-semibold">Carrier Assistant</h1>
            <p className="text-sm text-gray-600">
              Ask carrier eligibility/coverage questions with quick citations.
            </p>
          </div>
        </header>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Carrier</label>
              <select
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
              >
                {carriers.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">LOB</label>
              <select
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                value={lob}
                onChange={(e) => setLob(e.target.value)}
              >
                {lobs.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">State</label>
              <select
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                value={stateVal}
                onChange={(e) => setStateVal(e.target.value)}
              >
                {states.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Program (optional)</label>
              <select
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
              >
                <option value="">Select</option>
                {programs.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Version</label>
              <select
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
              >
                {versions.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Question</label>
            <textarea
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., Is a 12-year-old roof eligible with wind coverage in TX coastal counties?"
            />
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleAsk}
              disabled={loading || !question.trim()}
              className="rounded-lg bg-[#1EC8C8] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#19b3b3] disabled:opacity-50"
            >
              {loading ? "Asking..." : "Ask"}
            </button>
          </div>
        </section>

        {hasResult && (
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-teal-700">Answer</p>
                <h3 className="text-xl font-semibold">
                  {answer} <span className="text-sm font-normal text-gray-600">({carrier} • {lob} • {stateVal})</span>
                </h3>
                {conditions && <p className="mt-1 text-sm text-gray-800">{conditions}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleFeedback("up")}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    feedback === "up" ? "border-green-500 text-green-600" : "border-gray-200 text-gray-700"
                  }`}
                >
                  👍
                </button>
                <button
                  onClick={() => handleFeedback("down")}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    feedback === "down" ? "border-red-500 text-red-600" : "border-gray-200 text-gray-700"
                  }`}
                >
                  👎
                </button>
              </div>
            </div>

            {feedback === "down" && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <label className="block text-sm font-medium text-red-800">Feedback reason</label>
                <input
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  value={feedbackReason}
                  onChange={(e) => setFeedbackReason(e.target.value)}
                  placeholder="Citation wrong / missing info / off-topic..."
                />
              </div>
            )}

            <div>
              <p className="text-xs uppercase tracking-wide text-teal-700">Sources</p>
              <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                {sources.map((s, idx) => (
                  <div key={idx} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="text-sm font-semibold text-gray-900">
                      {s.doc} <span className="text-xs text-gray-600">({s.page})</span>
                    </div>
                    <div className="mt-1 text-sm text-gray-700">{s.snippet}</div>
                  </div>
                ))}
              </div>
            </div>

            <details className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-gray-800">Retrieved chunks (debug)</summary>
              <div className="mt-2 space-y-2 text-sm text-gray-700">
                {retrieved.map((r) => (
                  <div key={r.id} className="rounded border border-gray-200 bg-white p-2">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>[{r.id}]</span>
                      <span>{r.score === undefined ? "score: n/a" : `score: ${r.score.toFixed(4)}`}</span>
                    </div>
                    <div className="text-gray-800">{r.text}</div>
                  </div>
                ))}
              </div>
            </details>
          </section>
        )}
      </div>
    </main>
  );
}
