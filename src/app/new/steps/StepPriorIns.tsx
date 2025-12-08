"use client";

import React from "react";
import type { FormData } from "@/types/formData";

interface StepPriorInsProps {
  form: FormData;
  setForm: React.Dispatch<React.SetStateAction<FormData>>;
  errors: Record<string, string>;
  nextStep: () => void;
  prevStep: () => void;
}

export default function StepPriorIns({
  form,
  setForm,
  errors,
  nextStep,
  prevStep,
}: StepPriorInsProps) {
  const fieldError = (key: string) => errors?.[key];
  const err = (key: string) =>
    fieldError(key) ? (
      <p className="text-red-600 text-sm mt-1">{fieldError(key)}</p>
    ) : null;
  const controlClass = (key: string) =>
    `border rounded px-3 py-2 w-full text-gray-700 ${
      fieldError(key) ? "border-red-500" : "border-gray-300"
    }`;

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold mb-4">Prior Insurance</h3>

      {/* Have insurance? */}
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700">
          Do you currently have insurance?
        </label>
        <select
          className={controlClass("hasInsurance")}
          value={form.currentInsurance.hasInsurance}
          onChange={(e) =>
            setForm({
              ...form,
              currentInsurance: {
                ...form.currentInsurance,
                hasInsurance: e.target.value,
              },
            })
          }
        >
          <option value="">Select</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
        {err("hasInsurance")}
      </div>

      {/* Show only if Yes */}
      {form.currentInsurance.hasInsurance === "Yes" && (
        <>
          {/* Provider */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Insurance Provider
            </label>
            <input
              className={controlClass("provider")}
              value={form.currentInsurance.provider}
              onChange={(e) =>
                setForm({
                  ...form,
                  currentInsurance: {
                    ...form.currentInsurance,
                    provider: e.target.value,
                  },
                })
              }
            />
            {err("provider")}
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              How long insured?
            </label>
            <select
              className={controlClass("duration")}
              value={form.currentInsurance.duration}
              onChange={(e) =>
                setForm({
                  ...form,
                  currentInsurance: {
                    ...form.currentInsurance,
                    duration: e.target.value,
                  },
                })
              }
            >
              <option value="">Select</option>
              <option value="6+ Months">6+ Months</option>
              <option value="1–5 Months">1–5 Months</option>
              <option value="New Driver / No History">
                New Driver / No History
              </option>
            </select>
            {err("duration")}
          </div>

          {/* BI Limits */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              BI/PD Liability Limit
            </label>
            <select
              className={controlClass("bodilyInjuryLimit")}
              value={form.currentInsurance.bodilyInjuryLimit}
              onChange={(e) =>
                setForm({
                  ...form,
                  currentInsurance: {
                    ...form.currentInsurance,
                    bodilyInjuryLimit: e.target.value,
                  },
                })
              }
            >
              <option value="">Select</option>
              <option value="30/60">30/60</option>
              <option value="50/100">50/100</option>
              <option value="100/300">100/300</option>
              <option value="250/500">250/500</option>
            </select>
            {err("bodilyInjuryLimit")}
          </div>
        </>
      )}

      {/* Show Lapse if "No" */}
      {form.currentInsurance.hasInsurance === "No" && (
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            How long without insurance?
          </label>
          <select
            className={controlClass("lapseDuration")}
            value={form.currentInsurance.lapseDuration}
            onChange={(e) =>
              setForm({
                ...form,
                currentInsurance: {
                  ...form.currentInsurance,
                  lapseDuration: e.target.value,
                },
              })
            }
          >
            <option value="">Select</option>
            <option value="Less than 30 days">Less than 30 days</option>
            <option value="1–6 Months">1–6 Months</option>
            <option value="6+ Months">6+ Months</option>
          </select>
          {err("lapseDuration")}
        </div>
      )}

      <div className="pt-4 space-y-4 border-t text-gray-700">
        <h4 className="text-lg font-semibold text-[#1EC8C8] ">
          Contact information
        </h4>
        <p className="text-sm text-gray-500">
          We&apos;ll send your quote details here.
        </p>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Phone
          </label>
          <input
            className={controlClass("contact_phone")}
            value={form.contact.phone}
            onChange={(e) =>
              setForm({
                ...form,
                contact: { ...form.contact, phone: e.target.value },
              })
            }
            placeholder="(555) 123-4567"
          />
          {err("contact_phone")}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Email
          </label>
          <input
            type="email"
            className={controlClass("contact_email")}
            value={form.contact.email}
            onChange={(e) =>
              setForm({
                ...form,
                contact: { ...form.contact, email: e.target.value },
              })
            }
            placeholder="name@email.com"
          />
          {err("contact_email")}
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <button
          type="button"
          className="px-4 py-2 border rounded text-gray-700"
          onClick={prevStep}
        >
          ← Previous
        </button>
        <button
          type="button"
          className="px-4 py-2 bg-[#1EC8C8] text-white rounded hover:bg-[#19b3b3]"
          onClick={nextStep}
        >
          Next Step →
        </button>
      </div>
    </div>
  );
}
