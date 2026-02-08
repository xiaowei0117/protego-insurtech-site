"use client";

import { useEffect, useState } from "react";
import type { FormData } from "@/types/formData";

type Props = {
  step: number;
  stepsLength: number;
  form: FormData;
};

export default function SmartQuoteAssistantPanel({ step, stepsLength, form }: Props) {
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [assistantResult, setAssistantResult] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatStorageKey = "autoQuoteAssistantChat";

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(chatStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setChatMessages(parsed);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(chatStorageKey, JSON.stringify(chatMessages));
    } catch {
      // ignore storage errors
    }
  }, [chatMessages]);

  async function runQuoteAssistant(
    intent: "missing_info" | "explain_price" | "recommend_coverage"
  ) {
    setAssistantLoading(true);
    setAssistantError(null);
    try {
      const res = await fetch("/api/auto-quote-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent,
          form: {
            applicant: {
              firstName: form.firstName,
              lastName: form.lastName,
              address: form.address,
              city: form.city,
              state: form.state,
              zipCode: form.zipCode,
            },
            cars: form.cars,
            drivers: form.drivers,
            currentInsurance: form.currentInsurance,
            contact: form.contact,
            selectedPackage: form.selectedPackage,
            coverage: form.coverage,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Assistant request failed");
      }
      setAssistantResult(data);
    } catch (err: any) {
      setAssistantError(err?.message || "Failed to run assistant");
    } finally {
      setAssistantLoading(false);
    }
  }

  async function sendChat() {
    const question = chatInput.trim();
    if (!question || chatLoading) return;
    const nextMessages = [...chatMessages, { role: "user", content: question }];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch("/api/auto-quote-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "general",
          question,
          messages: nextMessages,
          form: {
            applicant: {
              firstName: form.firstName,
              lastName: form.lastName,
              address: form.address,
              city: form.city,
              state: form.state,
              zipCode: form.zipCode,
            },
            cars: form.cars,
            drivers: form.drivers,
            currentInsurance: form.currentInsurance,
            contact: form.contact,
            selectedPackage: form.selectedPackage,
            coverage: form.coverage,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Assistant request failed");
      }
      const reply = data?.llm || data?.answer || "Thanks for your question.";
      setChatMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: err?.message || "Sorry, I could not answer that.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <aside className="hidden w-80 shrink-0 lg:block">
      <div className="sticky top-6 space-y-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">
              Smart Quote Assistant
            </h3>
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
              Online
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            I can check missing info, explain price changes, and suggest
            coverage options.
          </p>

          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={() => runQuoteAssistant("missing_info")}
              disabled={assistantLoading}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {assistantLoading ? "Thinking..." : "Review missing info"}
            </button>
            <button
              type="button"
              onClick={() => runQuoteAssistant("explain_price")}
              disabled={assistantLoading}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {assistantLoading ? "Thinking..." : "Why is my quote higher?"}
            </button>
            <button
              type="button"
              onClick={() => runQuoteAssistant("recommend_coverage")}
              disabled={assistantLoading}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {assistantLoading ? "Thinking..." : "Recommend a coverage package"}
            </button>
          </div>

          {(assistantResult || assistantError) && (
            <div className="mt-4 rounded-lg bg-gray-50 p-3">
              {assistantError ? (
                <p className="text-xs text-red-600">{assistantError}</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-800">{assistantResult?.answer}</p>
                  {assistantResult?.llm && (
                    <p className="text-xs text-gray-600">{assistantResult.llm}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Confidence: {assistantResult?.confidence || "n/a"}
                  </p>
                  {!!assistantResult?.missingFields?.length && (
                    <ul className="list-disc space-y-1 pl-4 text-xs text-gray-600">
                      {assistantResult.missingFields.map((item: string) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                  {!!assistantResult?.priceFactors?.length && (
                    <ul className="list-disc space-y-1 pl-4 text-xs text-gray-600">
                      {assistantResult.priceFactors.map((item: string) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">
              Ask a question
            </h4>
            <button
              type="button"
              onClick={() => setChatMessages([])}
              className="text-xs font-medium text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>
          <div className="mt-3 max-h-52 space-y-2 overflow-y-auto rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
            {chatMessages.length === 0 && (
              <p className="text-xs text-gray-500">
                Ask about pricing, coverage, or what to fill in next.
              </p>
            )}
            {chatMessages.map((m, idx) => (
              <div
                key={`${m.role}-${idx}`}
                className={`rounded-lg px-3 py-2 ${
                  m.role === "user"
                    ? "bg-white text-gray-800"
                    : "bg-emerald-50 text-emerald-900"
                }`}
              >
                {m.content}
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  sendChat();
                }
              }}
              placeholder="Type your question..."
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400"
            />
            <button
              type="button"
              onClick={sendChat}
              disabled={chatLoading}
              className="rounded-lg bg-[#1EC8C8] px-3 py-2 text-sm font-medium text-white hover:bg-[#19b3b3] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {chatLoading ? "..." : "Send"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-900">Context snapshot</h4>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            <li>
              Step: {step} / {stepsLength}
            </li>
            <li>Vehicles: {form.cars?.length || 0}</li>
            <li>Drivers: {form.drivers?.length || 0}</li>
          </ul>
          <div className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
            Tip: Add VIN or full Y/M/M info to improve accuracy.
          </div>
        </div>

        <div className="rounded-2xl border border-dashed bg-white p-5">
          <h4 className="text-sm font-semibold text-gray-900">Need help?</h4>
          <p className="mt-2 text-sm text-gray-600">
            Ask an agent to review your quote before submission.
          </p>
          <button
            type="button"
            className="mt-3 w-full rounded-lg bg-[#1EC8C8] px-3 py-2 text-sm font-medium text-white hover:bg-[#19b3b3]"
          >
            Contact an agent
          </button>
        </div>
      </div>
    </aside>
  );
}
