"use client";

import React from "react";
import { US_STATES } from "@/utils/geo";

interface StepApplicantProps {
  form: any;
  setForm: (data: any) => void;
  errors: any;
  touchedSteps: number[];
  step: number;
  nextStep: () => void;
}

export default function StepApplicant({
  form,
  setForm,
  errors,
  touchedSteps,
  step,
  nextStep,
}: StepApplicantProps) {
  console.log("🟦 StepApplicant Rendered");
  console.log("🟦 StepApplicant props:", { nextStep });

  return (
    <div>
      <h3 className="text-[#1EC8C8] font-semibold mb-4">
        Tell us a little about you
      </h3>

      {/* ========= Personal Info ========= */}
      <div className="grid grid-cols-2 gap-4 mb-8 text-gray-700">
        {/* First Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            First Name
          </label>
          <input
            className={`border rounded-lg px-3 py-2 w-full ${
              errors.firstName ? "border-red-500" : "border-gray-400"
            }`}
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
          />
        </div>

        {/* Last Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Last Name
          </label>
          <input
            className={`border rounded-lg px-3 py-2 w-full ${
              errors.lastName ? "border-red-500" : "border-gray-400"
            }`}
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
          />
        </div>

        {/* Birthdate */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Birth date
          </label>
          <input
            type="date"
            className={`border text-gray-700 rounded-lg px-3 py-2 w-full ${
              errors.birthDate ? "border-red-500" : "border-gray-400"
            }`}
            value={form.birthDate}
            onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
            max={new Date().toISOString().split("T")[0]}
          />
        </div>

        {/* Gender */}
        <div className="flex gap-4 items-center mt-6">
          <label className="flex items-center gap-1 font-medium text-gray-700">
            <input
              type="radio"
              checked={form.gender === "male"}
              onChange={() => setForm({ ...form, gender: "male" })}
            />
            Male
          </label>
          <label className="flex items-center gap-1 font-medium text-gray-700">
            <input
              type="radio"
              checked={form.gender === "female"}
              onChange={() => setForm({ ...form, gender: "female" })}
            />
            Female
          </label>
        </div>
      </div>

      {/* ========= Address Info ========= */}
      <h3 className="text-[#1EC8C8] font-semibold mb-3">
        Where will you park your car overnight?
      </h3>

      <div className="grid grid-cols-2 gap-4 text-gray-700">
        {/* Address */}
        <div>
          <label className="block text-sm font-medium mb-1">Address</label>
          <input
            className={`border rounded-lg px-3 py-2 w-full ${
              errors.address ? "border-red-500" : "border-gray-400"
            }`}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>

        {/* Unit */}
        <div>
          <label className="block text-sm font-medium mb-1">Unit</label>
          <input
            className="border rounded-lg px-3 py-2 w-full border-gray-400"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
          />
        </div>

        {/* City */}
        <div>
          <label className="block text-sm font-medium mb-1">City</label>
          <input
            className={`border rounded-lg px-3 py-2 w-full ${
              errors.city ? "border-red-500" : "border-gray-400"
            }`}
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </div>

        {/* State */}
        <div>
          <label className="block text-sm font-medium mb-1">State</label>
          <select
            className={`border rounded px-3 py-2 w-full ${
              errors.state ? "border-red-500" : "border-gray-400"
            }`}
            value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value })}
          >
            <option value="">Select State</option>
            {US_STATES.map((s) => (
              <option key={s.abbr} value={s.abbr}>
                {s.name} ({s.abbr})
              </option>
            ))}
          </select>
          {errors.state && (
            <p className="text-red-600 text-sm">{errors.state}</p>
          )}
        </div>

        {/* ZIP */}
        <div>
          <label className="block text-sm font-medium mb-1">Zip Code</label>
          <input
            className={`border rounded px-3 py-2 w-full ${
              errors.zipCode ? "border-red-500" : "border-gray-400"
            }`}
            value={form.zipCode}
            onChange={(e) =>
              setForm({ ...form, zipCode: e.target.value.replace(/\D/g, "") })
            }
            maxLength={5}
          />
          {errors.zipCode && (
            <p className="text-red-600 text-sm">{errors.zipCode}</p>
          )}
        </div>
      </div>

      {/* Residence */}
      <div className="mt-6">
        <label className="font-medium text-[#1EC8C8] mb-2 block">
          What best describes your current living situation?
        </label>

        <div className="space-y-2 text-gray-600">
          {[
            "I own my house or condo",
            "I own my apartment",
            "I rent my home or apartment",
            "I live with friends or family",
            "Other",
          ].map((option) => (
            <label key={option} className="flex items-center gap-2">
              <input
                type="radio"
                checked={form.residence === option}
                onChange={() => setForm({ ...form, residence: option })}
              />
              {option}
            </label>
          ))}
        </div>
      </div>

      {/* ===== Step Buttons ===== */}
      <div className="flex justify-end mt-10">
        <button
          type="button"
          onClick={(e) => {
            console.log("CLICKED!!");
            nextStep();
          }}
          className="bg-[#1EC8C8] text-white px-4 py-2 rounded-lg relative z-50 hover:bg-[#19b3b3]"
        >
          Next Step ▶
        </button>
      </div>
    </div>
  );
}
