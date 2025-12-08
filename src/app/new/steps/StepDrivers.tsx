"use client";

import React, { useEffect } from "react";
import type { FormData, Driver } from "@/types/formData";

interface StepDriversProps {
  form: FormData;
  setForm: React.Dispatch<React.SetStateAction<FormData>>;
  errors: any;
  OCCUPATIONS: string[];
}

export default function StepDrivers({
  form,
  setForm,
  errors,
  OCCUPATIONS,
}: StepDriversProps) {
  /* ----------------------------
      1) Sync Primary Driver (index 0)
  ----------------------------- */
  useEffect(() => {
    let updated = [...form.drivers];

    if (!updated[0]) {
      updated[0] = {
        firstName: "",
        lastName: "",
        birthDate: "",
        relationship: "Self",
        maritalStatus: "",
        occupation: "",
        education: "",
        dlNumber: "",
        dlState: "",
      };
    }

    updated[0].firstName = form.firstName;
    updated[0].lastName = form.lastName;
    updated[0].birthDate = form.birthDate;
    updated[0].relationship = "Self";
    updated[0].maritalStatus = form.maritalStatus;
    updated[0].education = form.education;
    updated[0].occupation = form.occupation;

    setForm((prev) => ({ ...prev, drivers: updated }));
  }, [
    form.firstName,
    form.lastName,
    form.birthDate,
    form.maritalStatus,
    form.education,
    form.occupation,
  ]);

  /* ----------------------------
      2) Sync Spouse Driver (index 1)
  ----------------------------- */
  useEffect(() => {
    let updated = [...form.drivers];

    if (form.maritalStatus !== "Married") {
      // Remove spouse info if not married
      if (updated[1]) updated.splice(1, 1);
      setForm((prev) => ({ ...prev, drivers: updated }));
      return;
    }

    if (!updated[1]) {
      updated[1] = {
        firstName: "",
        lastName: "",
        birthDate: "",
        relationship: "Spouse",
        maritalStatus: "Married",
        occupation: "",
        education: "",
        dlNumber: "",
        dlState: "",
      };
    }

    updated[1].firstName = form.spouseFirstName;
    updated[1].lastName = form.spouseLastName;
    updated[1].birthDate = form.spouseBirthDate;
    updated[1].relationship = "Spouse";
    updated[1].maritalStatus = "Married";
    updated[1].education = form.spouseEducation;
    updated[1].occupation = form.spouseOccupation;

    setForm((prev) => ({ ...prev, drivers: updated }));
  }, [
    form.maritalStatus,
    form.spouseFirstName,
    form.spouseLastName,
    form.spouseBirthDate,
    form.spouseEducation,
    form.spouseOccupation,
  ]);

  /* Additional drivers start index */
  const additionalStartIndex = form.maritalStatus === "Married" ? 2 : 1;

  /* Add Additional Driver */
  const addDriver = () => {
    const newDriver: Driver = {
      firstName: "",
      lastName: "",
      birthDate: "",
      relationship: "",
      maritalStatus: "",
      occupation: "",
      education: "",
      dlNumber: "",
      dlState: "",
    };

    setForm({
      ...form,
      drivers: [...form.drivers, newDriver],
    });
  };

  /* Remove driver by real index */
  const removeDriver = (index: number) => {
    const updated = [...form.drivers];
    updated.splice(index, 1);
    setForm({ ...form, drivers: updated });
  };

  /* Helper to show errors */
  const err = (key: string) =>
    errors && errors[key] ? (
      <p className="text-red-600 text-sm mt-1">{errors[key]}</p>
    ) : null;

  /* ----------------------------
      UI
  ----------------------------- */
  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">Drivers</h3>

      {/* =======================
          PRIMARY DRIVER (index 0)
      =========================*/}
      <div className="mb-6 p-4 border rounded-lg bg-gray-50">
        <h4 className="text-md font-semibold text-gray-800 mb-3">
          Primary Driver – {form.firstName} {form.lastName}
        </h4>

        <div className="grid grid-cols-1 gap-4">
          {/* Marital */}
          <div>
            <label className="block mb-1 font-medium text-gray-700">
              Marital Status
            </label>
            <select
              className="border rounded p-2 w-full text-gray-700"
              value={form.maritalStatus}
              onChange={(e) =>
                setForm({ ...form, maritalStatus: e.target.value })
              }
            >
              <option value="">Select</option>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Separated">Separated</option>
              <option value="Divorced">Divorced</option>
              <option value="Widowed">Widowed</option>
            </select>
            {err("driver_1_maritalStatus")}
          </div>

          {/* Education */}
          <div>
            <label className="block mb-1 font-medium text-gray-700">
              Education
            </label>
            <select
              className="border rounded p-2 w-full text-gray-700"
              value={form.education}
              onChange={(e) => setForm({ ...form, education: e.target.value })}
            >
              <option value="">Select</option>
              <option value="High School">High School</option>
              <option value="Associate Degree">Associate Degree</option>
              <option value="Bachelor’s Degree">Bachelor’s Degree</option>
              <option value="Master’s Degree">Master’s Degree</option>
              <option value="Doctorate">Doctorate</option>
            </select>
            {err("driver_1_education")}
          </div>

          {/* Occupation */}
          <div>
            <label className="block mb-1 font-medium text-gray-700">
              Occupation
            </label>
            <select
              className="border rounded p-2 w-full text-gray-700"
              value={form.occupation}
              onChange={(e) => setForm({ ...form, occupation: e.target.value })}
            >
              <option value="">Select Occupation</option>
              {OCCUPATIONS.map((job) => (
                <option key={job} value={job}>
                  {job}
                </option>
              ))}
            </select>
            {err("driver_1_occupation")}
          </div>

          {/* DL Number */}
          <div>
            <label className="block mb-1 font-medium text-gray-700">
              Driver License Number
            </label>
            <input
              className="border rounded p-2 w-full text-gray-700"
              value={form.drivers[0]?.dlNumber || ""}
              onChange={(e) => {
                const updated = [...form.drivers];
                updated[0].dlNumber = e.target.value;
                setForm({ ...form, drivers: updated });
              }}
            />
            {err("driver_1_dlNumber")}
          </div>

          {/* DL State */}
          <div>
            <label className="block mb-1 font-medium text-gray-700">
              DL State
            </label>
            <select
              className="border rounded p-2 w-full text-gray-700"
              value={form.drivers[0]?.dlState || ""}
              onChange={(e) => {
                const updated = [...form.drivers];
                updated[0].dlState = e.target.value;
                setForm({ ...form, drivers: updated });
              }}
            >
              <option value="">Select State</option>
              <option value="TX">Texas</option>
              <option value="CA">California</option>
              <option value="FL">Florida</option>
              <option value="NY">New York</option>
              <option value="WA">Washington</option>
            </select>
            {err("driver_1_dlState")}
          </div>
        </div>
      </div>

      {/* =======================
          SPOUSE DRIVER (index = 1)
      =========================*/}
      {form.maritalStatus === "Married" && (
        <div className="mt-6 p-4 border rounded-lg bg-white">
          <h4 className="text-md font-semibold">Spouse Information</h4>

          <div className="grid grid-cols-2 gap-4">
            {/* First Name */}
            <div>
              <label className="block mb-1 font-medium text-gray-700">
                First Name
              </label>
              <input
                className="border rounded p-2 w-full text-gray-700"
                value={form.spouseFirstName}
                onChange={(e) =>
                  setForm({ ...form, spouseFirstName: e.target.value })
                }
              />
              {err("driver_2_firstName")}
            </div>

            {/* Last Name */}
            <div>
              <label className="block mb-1 font-medium text-gray-700">
                Last Name
              </label>
              <input
                className="border rounded p-2 w-full text-gray-700"
                value={form.spouseLastName}
                onChange={(e) =>
                  setForm({ ...form, spouseLastName: e.target.value })
                }
              />
              {err("driver_2_lastName")}
            </div>

            {/* Birthdate */}
            <div>
              <label className="block mb-1 font-medium text-gray-700">
                Birth Date
              </label>
              <input
                type="date"
                className="border rounded p-2 w-full text-gray-700"
                value={form.spouseBirthDate}
                onChange={(e) =>
                  setForm({ ...form, spouseBirthDate: e.target.value })
                }
              />
              {err("driver_2_birthDate")}
            </div>

            {/* Education */}
            <div>
              <label className="block mb-1 font-medium text-gray-700">
                Education
              </label>
              <select
                className="border rounded p-2 w-full text-gray-700"
                value={form.spouseEducation}
                onChange={(e) =>
                  setForm({ ...form, spouseEducation: e.target.value })
                }
              >
                <option value="">Select Education</option>
                <option value="High School">High School</option>
                <option value="Associate Degree">Associate Degree</option>
                <option value="Bachelor’s Degree">Bachelor’s Degree</option>
                <option value="Master’s Degree">Master’s Degree</option>
                <option value="Doctorate">Doctorate</option>
              </select>
              {err("driver_2_education")}
            </div>

            {/* Occupation */}
            <div>
              <label className="block mb-1 font-medium text-gray-700">
                Occupation
              </label>
              <select
                className="border rounded p-2 w-full text-gray-700"
                value={form.spouseOccupation}
                onChange={(e) =>
                  setForm({ ...form, spouseOccupation: e.target.value })
                }
              >
                <option value="">Select Occupation</option>
                {OCCUPATIONS.map((job) => (
                  <option key={job} value={job}>
                    {job}
                  </option>
                ))}
              </select>
              {err("driver_2_occupation")}
            </div>

            {/* DL Number */}
            <div>
              <label className="block mb-1 font-medium text-gray-700">
                DL Number
              </label>
              <input
                className="border rounded p-2 w-full text-gray-700"
                value={form.drivers[1]?.dlNumber || ""}
                onChange={(e) => {
                  const updated = [...form.drivers];
                  updated[1].dlNumber = e.target.value;
                  setForm({ ...form, drivers: updated });
                }}
              />
              {err("driver_2_dlNumber")}
            </div>

            {/* DL State */}
            <div>
              <label className="block mb-1 font-medium text-gray-700">
                DL State
              </label>
              <select
                className="border rounded p-2 w-full text-gray-700"
                value={form.drivers[1]?.dlState || ""}
                onChange={(e) => {
                  const updated = [...form.drivers];
                  updated[1].dlState = e.target.value;
                  setForm({ ...form, drivers: updated });
                }}
              >
                <option value="">Select</option>
                <option value="TX">TX</option>
                <option value="CA">CA</option>
                <option value="FL">FL</option>
                <option value="NY">NY</option>
                <option value="WA">WA</option>
              </select>
              {err("driver_2_dlState")}
            </div>
          </div>
        </div>
      )}

      {/* =======================
          ADDITIONAL DRIVERS
      =========================*/}
      <h4 className="text-md font-semibold mb-3">Additional Drivers</h4>

      {form.drivers.slice(additionalStartIndex).map((driver, i) => {
        const index = additionalStartIndex + i;

        return (
          <div key={index} className="p-4 mb-4 border rounded-lg bg-gray-50">
            <button
              onClick={() => removeDriver(index)}
              className="text-red-600 float-right"
            >
              ✖ Remove
            </button>

            <div className="grid grid-cols-2 gap-4 mt-2 text-gray-700">
              {/* First Name */}
              <div>
                <label className="block mb-1 text-gray-700">First Name</label>
                <input
                  className="border rounded p-2 w-full"
                  value={driver.firstName}
                  onChange={(e) => {
                    const updated = [...form.drivers];
                    updated[index].firstName = e.target.value;
                    setForm({ ...form, drivers: updated });
                  }}
                />
                {err(`driver_${index + 1}_firstName`)}
              </div>

              {/* Last Name */}
              <div>
                <label className="block mb-1 text-gray-700">Last Name</label>
                <input
                  className="border rounded p-2 w-full text-gray-700"
                  value={driver.lastName}
                  onChange={(e) => {
                    const updated = [...form.drivers];
                    updated[index].lastName = e.target.value;
                    setForm({ ...form, drivers: updated });
                  }}
                />
                {err(`driver_${index + 1}_lastName`)}
              </div>

              {/* Birth Date */}
              <div>
                <label className="block mb-1 text-gray-700">Birth Date</label>
                <input
                  type="date"
                  className="border rounded p-2 w-full text-gray-700"
                  value={driver.birthDate}
                  onChange={(e) => {
                    const updated = [...form.drivers];
                    updated[index].birthDate = e.target.value;
                    setForm({ ...form, drivers: updated });
                  }}
                />
                {err(`driver_${index + 1}_birthDate`)}
              </div>

              {/* Relationship */}
              <div>
                <label className="block mb-1 text-gray-700">Relationship</label>
                <select
                  className="border rounded p-2 w-full text-gray-700"
                  value={driver.relationship}
                  onChange={(e) => {
                    const updated = [...form.drivers];
                    updated[index].relationship = e.target.value;
                    setForm({ ...form, drivers: updated });
                  }}
                >
                  <option value="">Select</option>
                  <option value="Parent">Parent</option>
                  <option value="Child">Child</option>
                  <option value="Relative">Relative</option>
                  <option value="Other">Other</option>
                </select>
                {err(`driver_${index + 1}_relationship`)}
              </div>

              {/* Marital */}
              <div>
                <label className="block mb-1 text-gray-700">
                  Marital Status
                </label>
                <select
                  className="border rounded p-2 w-full text-gray-700"
                  value={driver.maritalStatus}
                  onChange={(e) => {
                    const updated = [...form.drivers];
                    updated[index].maritalStatus = e.target.value;
                    setForm({ ...form, drivers: updated });
                  }}
                >
                  <option value="">Select</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
                {err(`driver_${index + 1}_maritalStatus`)}
              </div>

              {/* DL Number */}
              <div>
                <label className="block mb-1 text-gray-700">DL Number</label>
                <input
                  className="border rounded p-2 w-full text-gray-700"
                  value={driver.dlNumber}
                  onChange={(e) => {
                    const updated = [...form.drivers];
                    updated[index].dlNumber = e.target.value;
                    setForm({ ...form, drivers: updated });
                  }}
                />
                {err(`driver_${index + 1}_dlNumber`)}
              </div>

              {/* DL State */}
              <div>
                <label className="block mb-1 text-gray-700">DL State</label>
                <select
                  className="border rounded p-2 w-full text-gray-700"
                  value={driver.dlState}
                  onChange={(e) => {
                    const updated = [...form.drivers];
                    updated[index].dlState = e.target.value;
                    setForm({ ...form, drivers: updated });
                  }}
                >
                  <option value="">Select</option>
                  <option value="TX">TX</option>
                  <option value="CA">CA</option>
                  <option value="FL">FL</option>
                  <option value="NY">NY</option>
                  <option value="WA">WA</option>
                </select>
                {err(`driver_${index + 1}_dlState`)}
              </div>
            </div>
          </div>
        );
      })}

      <button className="border px-3 py-2 rounded" onClick={addDriver}>
        + Add a Driver
      </button>
    </div>
  );
}
