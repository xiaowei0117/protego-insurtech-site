"use client";

import { useState } from "react";
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
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              {assistantLoading ? "Thinking..." : "Review missing info"}
            </button>
            <button
              type="button"
              onClick={() => runQuoteAssistant("explain_price")}
              disabled={assistantLoading}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
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
