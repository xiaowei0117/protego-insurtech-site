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
}: StepCoverageProps) {
  const quotes = (result?.quotes as any[]) || [];
  const primaryPremium = result?.premium || quotes?.[0]?.premium || null;

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
      <h3 className="text-[#1EC8C8] font-semibold text-lg mb-4">
        Choose your coverage package
      </h3>

      {/* =======================
          三种预设套餐
      =======================*/}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            className={`relative border-2 ${
              pkg.color
            } rounded-xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 ${
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
            <h4 className="text-lg font-semibold text-gray-800 flex items-center justify-between">
              {pkg.name}
              {form.selectedPackage === pkg.name && (
                <span className="text-sm text-blue-600 font-medium">
                  ✓ Selected
                </span>
              )}
            </h4>

            <p className="text-sm text-gray-500 mb-3">{pkg.desc}</p>

            <ul className="text-sm text-gray-700 space-y-1">
              {Object.entries(
                pkg.coverage as Record<string, string>
              ).map(([k, v]) => (
                <li key={k} className="flex justify-between border-b py-1">
                  <span>{k}</span>
                  <span className="font-medium">{v}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* =======================
          自定义 Coverage
      =======================*/}
      <div className="mt-8">
        <h4 className="text-[#1EC8C8] font-semibold mb-4">
          Customize your coverage
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coverageFieldConfigs.map(({ key, label, options }) => (
            <div
              key={key}
              className="flex items-center justify-between border rounded-lg px-4 py-2"
            >
              <span className="text-sm font-medium text-gray-700">{label}</span>
              <select
                className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-800 w-44"
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

      {/* =======================
          Get Quote 按钮 + 结果
      =======================*/}
      <div className="mt-10 space-y-4">
        <button
          onClick={() => handleGetQuotes("submitQuote")}
          disabled={loading}
          className="bg-[#1EC8C8] text-white px-6 py-3 rounded-lg hover:bg-[#19b3b3] disabled:opacity-50"
        >
          {loading ? "Getting quotes..." : "Get Quote"}
        </button>

        {/* 保存申请，但不报价 */}
        {/* 
        <button
          onClick={() => handleGetQuotes("create")}
          disabled={loading}
          className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Application"}
        </button>
        */}

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

            {/* Quote Result */}
            {result && (
              <div className="mt-6 rounded-xl border bg-white p-6 shadow">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  Quote Result
                </h4>
                <p className="text-sm text-gray-700 mb-3">
                  Your agent will reach out to finalize your quote. We’ll also email the summary and next steps to the contact email you provided.
                </p>

            {/* Premium */}
            {primaryPremium ? (
              <p className="text-2xl font-bold text-gray-900">
                Estimated Premium: ${primaryPremium}
              </p>
            ) : (
              <p className="text-gray-500">No premium returned.</p>
            )}

            {/* Quote list (mock) */}
            {quotes.length > 0 && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                {quotes.map((q, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between text-sm font-semibold text-gray-800">
                      <span>{q.carrier}</span>
                      {idx === 0 && (
                        <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded">
                          Best
                        </span>
                      )}
                    </div>
                    <div className="text-lg font-bold text-gray-900 mt-1">
                      ${q.premium}
                    </div>
                    {q.eta && (
                      <div className="text-xs text-gray-500">ETA: {q.eta}</div>
                    )}

                    {q.url && (
                      <a
                        href={q.url}
                        target="_blank"
                        className="text-xs text-blue-600 underline mt-2 inline-block"
                      >
                        View mock quote →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Quote URL */}
            {result.quoteUrl && (
              <a
                href={result.quoteUrl}
                target="_blank"
                className="text-blue-600 underline text-sm mt-4 inline-block"
              >
                View full quote details →
              </a>
            )}

            {/* Save prompt (hide for reopen/edit flow) */}
            {!isReopen && (
              <div className="mt-6 rounded-lg border border-teal-100 bg-teal-50 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="text-sm text-gray-800">
                    Want to save your quote?
                    <span className="block text-gray-600">
                      ✅ Yes, save and sign in to view/edit anytime.
                    </span>
                  </div>
                  <button
                    onClick={handleSaveQuote}
                    disabled={!canSave || savingQuote}
                    className="mt-2 inline-flex items-center justify-center rounded-lg bg-[#1EC8C8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#19b3b3] disabled:opacity-50 md:mt-0"
                  >
                    {savingQuote ? "Saving..." : "Save my quote"}
                  </button>
                </div>
                {saveMessage && (
                  <p className="mt-2 text-xs text-teal-800">{saveMessage}</p>
                )}
              </div>
            )}

            {/* Debug Mock Mode */}
            {result.raw?.mock && (
              <div className="mt-4 text-xs text-gray-500">
                (Mock Mode Active — not calling EZLynx API)
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
