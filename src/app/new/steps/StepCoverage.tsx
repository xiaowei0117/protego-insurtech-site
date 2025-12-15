"use client";

import React from "react";
import type { FormData } from "@/types/formData";

interface StepCoverageProps {
  form: FormData;
  setForm: React.Dispatch<React.SetStateAction<FormData>>;
  COVERAGE_PRESETS: any;
  loading: boolean;
  error: string | null;
  result: any;
  handleGetQuotes: (mode: "submitQuote" | "create") => void;
  handleSaveQuote: () => void;
  savingQuote: boolean;
  canSave: boolean;
  saveMessage?: string | null;
  isReopen: boolean;
  dualApplicantQuotes: boolean;
  setDualApplicantQuotes: (v: boolean) => void;
}

export default function StepCoverage({
  form,
  setForm,
  COVERAGE_PRESETS,
  loading,
  error,
  result,
  handleGetQuotes,
  handleSaveQuote,
  savingQuote,
  canSave,
  saveMessage,
  isReopen,
  dualApplicantQuotes,
  setDualApplicantQuotes,
}: StepCoverageProps) {
  const primaryResult = result?.primary ?? result ?? null;
  const spouseResult = result?.spouse ?? null;

  const quotesPrimary = (primaryResult?.quotes as any[]) || [];
  const primaryPremium = primaryResult?.premium || quotesPrimary?.[0]?.premium || null;
  const quotesSpouse = (spouseResult?.quotes as any[]) || [];
  const spousePremium = spouseResult?.premium || quotesSpouse?.[0]?.premium || null;

  const coverageFieldConfigs: {
    key: keyof FormData["coverage"];
    label: string;
    options: string[];
  }[] = [
    {
      key: "Bodily Injury Liability",
      label: "Bodily Injury Liability",
      options: ["30k/60k", "50k/100k", "100k/300k", "250k/500k", "500k/1M"],
    },
    {
      key: "Property Damage",
      label: "Property Damage",
      options: ["25k", "50k", "100k", "250k", "500k"],
    },
    {
      key: "Uninsured/Underinsured Motorist Bodily Injury",
      label: "Uninsured/Underinsured Motorist Bodily Injury",
      options: ["30k/60k", "50k/100k", "100k/300k", "250k/500k"],
    },
    {
      key: "Uninsured/Underinsured Property Damage",
      label: "Uninsured/Underinsured Property Damage",
      options: ["25k", "50k", "100k", "250k"],
    },
    {
      key: "Medical Payment",
      label: "Medical Payment",
      options: ["500", "1,000", "2,000", "5,000", "10,000"],
    },
    {
      key: "Personal Injury Protection",
      label: "Personal Injury Protection",
      options: ["2,500", "5,000", "10,000", "25,000"],
    },
    {
      key: "Comprehensive Deductible",
      label: "Comprehensive Deductible",
      options: ["0", "250", "500", "1,000", "2,500"],
    },
    {
      key: "Collision Deductible",
      label: "Collision Deductible",
      options: ["0", "250", "500", "1,000", "2,500"],
    },
    {
      key: "Rental",
      label: "Rental",
      options: ["No Coverage", "30/day, 900 max", "50/day, 1,500 max"],
    },
    {
      key: "Roadside",
      label: "Roadside",
      options: ["No Coverage", "Included"],
    },
  ];

  return (
    <div className="space-y-8">
      <h3 className="text-[#1EC8C8] font-semibold text-lg mb-4">Choose your coverage package</h3>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[
          {
            name: "Basic",
            desc: "Essential protection for budget-conscious drivers.",
            color: "border-gray-300",
            coverage: COVERAGE_PRESETS.Basic,
          },
          {
            name: "Standard",
            desc: "Balanced protection and value.",
            color: "border-blue-400",
            coverage: COVERAGE_PRESETS.Standard,
          },
          {
            name: "Good",
            desc: "Comprehensive protection for peace of mind.",
            color: "border-green-500",
            coverage: COVERAGE_PRESETS.Good,
          },
        ].map((pkg, idx) => (
          <div
            key={idx}
            className={`relative border-2 ${pkg.color} rounded-xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 ${
              form.selectedPackage === pkg.name ? "ring-2 ring-blue-600" : ""
            }`}
            onClick={() =>
              setForm({
                ...form,
                selectedPackage: pkg.name,
                coverage: { ...COVERAGE_PRESETS[pkg.name] },
              })
            }
          >
            <h4 className="flex items-center justify-between text-lg font-semibold text-gray-800">
              {pkg.name}
              {form.selectedPackage === pkg.name && (
                <span className="text-sm font-medium text-blue-600">Selected</span>
              )}
            </h4>
            <p className="mb-3 text-sm text-gray-500">{pkg.desc}</p>
            <ul className="space-y-1 text-sm text-gray-700">
              {Object.entries(pkg.coverage as Record<string, string>).map(([k, v]) => (
                <li key={k} className="flex justify-between border-b py-1">
                  <span>{k}</span>
                  <span className="font-medium">{v}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h4 className="text-[#1EC8C8] font-semibold mb-4">Customize your coverage</h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {coverageFieldConfigs.map(({ key, label, options }) => (
            <div key={key} className="flex items-center justify-between rounded-lg border px-4 py-2">
              <span className="text-sm font-medium text-gray-700">{label}</span>
              <select
                className="w-44 rounded border border-gray-300 px-2 py-1 text-sm text-gray-800"
                value={form.coverage[key] || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    coverage: {
                      ...form.coverage,
                      [key]: e.target.value,
                    },
                  })
                }
              >
                <option value="">Select</option>
                {options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleGetQuotes("submitQuote")}
            disabled={loading}
            className="rounded-lg bg-[#1EC8C8] px-6 py-3 text-white hover:bg-[#19b3b3] disabled:opacity-50"
          >
            {loading ? "Getting quotes..." : "Get Quote"}
          </button>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-[#1EC8C8] focus:ring-[#1EC8C8]"
              checked={dualApplicantQuotes}
              onChange={(e) => setDualApplicantQuotes(e.target.checked)}
            />
            Get 2 quotes using husband and wife as applicant
          </label>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {result && (
          <div className="mt-6 space-y-6">
            <div className="rounded-xl border bg-white p-6 shadow">
              <h4 className="mb-4 text-lg font-semibold text-gray-900">Quote Result (Applicant)</h4>
              <p className="mb-3 text-sm text-gray-700">
                Your agent will reach out to finalize your quote. We’ll also email the summary and next steps to the
                contact email you provided.
              </p>
              {primaryPremium ? (
                <p className="text-2xl font-bold text-gray-900">Estimated Premium: ${primaryPremium}</p>
              ) : (
                <p className="text-gray-500">No premium returned.</p>
              )}
              {quotesPrimary.length > 0 && (
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  {quotesPrimary.map((q, idx) => (
                    <div key={idx} className="rounded-lg border border-gray-200 bg-gray-50 p-3 shadow-sm">
                      <div className="flex items-center justify-between text-sm font-semibold text-gray-800">
                        <span>{q.carrier || q.carrier_name}</span>
                        {idx === 0 && (
                          <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">Best</span>
                        )}
                      </div>
                      <div className="mt-1 text-lg font-bold text-gray-900">${q.premium}</div>
                      {q.eta && <div className="text-xs text-gray-500">ETA: {q.eta}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {spouseResult && (
              <div className="rounded-xl border bg-white p-6 shadow">
                <h4 className="mb-4 text-lg font-semibold text-gray-900">Quote Result (Spouse)</h4>
                {spousePremium ? (
                  <p className="text-2xl font-bold text-gray-900">Estimated Premium: ${spousePremium}</p>
                ) : (
                  <p className="text-gray-500">No premium returned.</p>
                )}
                {quotesSpouse.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                    {quotesSpouse.map((q, idx) => (
                      <div key={idx} className="rounded-lg border border-gray-200 bg-gray-50 p-3 shadow-sm">
                        <div className="flex items-center justify-between text-sm font-semibold text-gray-800">
                          <span>{q.carrier || q.carrier_name}</span>
                          {idx === 0 && (
                            <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">Best</span>
                          )}
                        </div>
                        <div className="mt-1 text-lg font-bold text-gray-900">${q.premium}</div>
                        {q.eta && <div className="text-xs text-gray-500">ETA: {q.eta}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!isReopen && (
              <div className="mt-6 rounded-lg border border-teal-100 bg-teal-50 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="text-sm text-gray-800">
                    Want to save your quote?
                    <span className="block text-gray-600">Yes, save and sign in to view/edit anytime.</span>
                  </div>
                  <button
                    onClick={handleSaveQuote}
                    disabled={!canSave || savingQuote}
                    className="mt-2 inline-flex items-center justify-center rounded-lg bg-[#1EC8C8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#19b3b3] disabled:opacity-50 md:mt-0"
                  >
                    {savingQuote ? "Saving..." : "Save my quote"}
                  </button>
                </div>
                {saveMessage && <p className="mt-2 text-xs text-teal-800">{saveMessage}</p>}
              </div>
            )}

            {result?.raw?.mock && (
              <div className="mt-4 text-xs text-gray-500">(Mock Mode Active - not calling EZLynx API)</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
