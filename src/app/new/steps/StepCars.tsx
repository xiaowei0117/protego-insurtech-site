// Full merged StepCars.tsx with VIN smart locking + Page-level errors
"use client";

import React, { useState } from "react";

interface Car {
  vin: string;
  year: string;
  make: string;
  model: string;
  subModel: string;
  ownership: number;
  usage: number;
  mileage: number;

  lockYear?: boolean;
  lockMake?: boolean;
  lockModel?: boolean;
  lockSubModel?: boolean;
}

interface StepCarsProps {
  form: any;
  setForm: (data: any) => void;
  errors: any;

  years: number[];
  makes: string[];
  models: Record<string, string[]>;
  loadModels: (year: string, make: string) => void;
  handleCarChange: (index: number, field: keyof Car, value: any) => void;

  nextStep: () => void;
  prevStep: () => void;
}

export default function StepCars({
  form,
  setForm,
  errors,
  years,
  makes,
  models,
  loadModels,
  handleCarChange,
  nextStep,
  prevStep,
}: StepCarsProps) {
  const [loading, setLoading] = useState(false);
  const [vinErrors, setVinErrors] = useState<string[]>([]);

  /* 获取页面级错误 */
  function getErr(carIndex: number, field: string) {
    return errors?.[`car_${carIndex}_${field}`] || null;
  }

  /* ⭐ VIN 查询 + 智能锁定 */
  async function lookupVIN(index: number) {
    const vin = form.cars[index].vin?.trim();
    if (!vin || vin.length !== 17) {
      const newErrors = [...vinErrors];
      newErrors[index] = "VIN must be 17 characters.";
      setVinErrors(newErrors);
      return;
    }

    const cleared = [...vinErrors];
    cleared[index] = "";
    setVinErrors(cleared);

    setLoading(true);
    try {
      const res = await fetch("/api/vin", {
        method: "POST",
        body: JSON.stringify({ vin }),
      });

      const json = await res.json();
      const result =
        json?.data?.VINValidateResult?.VehicleResults?.VehicleResult;

      if (!result) {
        const newErr = [...vinErrors];
        newErr[index] = "VIN not found or invalid.";
        setVinErrors(newErr);
        return;
      }

      const updated = [...form.cars];
      const car = updated[index];

      if (result.Year) {
        car.year = result.Year;
        car.lockYear = true;
      }

      if (result.Make) {
        car.make = result.Make;
        car.lockMake = true;
        loadModels(result.Year, result.Make);
      }

      if (result.Model) {
        car.model = result.Model;
        car.lockModel = true;
      }

      if (result.BodyStyle) {
        car.subModel = result.BodyStyle;
        car.lockSubModel = true;
      }

      setForm({ ...form, cars: updated });
    } catch (err) {
      console.error(err);
      const newErr = [...vinErrors];
      newErr[index] = "VIN decoding failed.";
      setVinErrors(newErr);
    } finally {
      setLoading(false);
    }
  }

  /* ⭐ 清除 VIN → 解锁 */
  function clearVIN(index: number) {
    const updated = [...form.cars];
    updated[index] = {
      vin: "",
      year: "",
      make: "",
      model: "",
      subModel: "",
      ownership: 0,
      usage: 0,
      mileage: 0,
      lockYear: false,
      lockMake: false,
      lockModel: false,
      lockSubModel: false,
    };

    setForm({ ...form, cars: updated });
  }

  return (
    <div>
      <h3 className="text-[#1EC8C8] font-semibold mb-4">
        Tell us about the vehicle(s).
      </h3>

      {form.cars.map((car: Car, index: number) => (
        <div
          key={index}
          className="border rounded-lg bg-white p-6 shadow-sm mb-8 relative"
        >
          {form.cars.length > 1 && (
            <button
              onClick={() => {
                const updated = form.cars.filter(
                  (_: any, i: number) => i !== index
                );
                setForm({ ...form, cars: updated });
              }}
              className="absolute right-4 top-4 text-red-600 text-sm"
            >
              🗑 Remove
            </button>
          )}

          <h3 className="text-lg font-semibold mb-4">Vehicle #{index + 1}</h3>

          {/* VIN 输入 */}
          <div className="mb-5">
            <label className="block text-sm mb-1 font-medium text-gray-700">
              VIN Number
            </label>

            <div className="flex gap-3 items-center">
              <input
                type="text"
                value={car.vin}
                maxLength={17}
                onChange={(e) => {
                  const sanitized = e.target.value
                    .replace(/[^a-zA-Z0-9]/g, "")
                    .toUpperCase()
                    .slice(0, 17);
                  handleCarChange(index, "vin", sanitized);
                  const clear = [...vinErrors];
                  clear[index] = "";
                  setVinErrors(clear);
                }}
                className={`border rounded px-3 py-2 w-64 text-gray-700 ${
                  getErr(index, "vin") ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Enter VIN"
              />

              <button
                onClick={() => lookupVIN(index)}
                className="px-4 py-2 bg-green-600 text-white rounded"
                disabled={loading}
              >
                {loading ? "Decoding..." : "Decode VIN"}
              </button>

              {(car.lockYear ||
                car.lockMake ||
                car.lockModel ||
                car.lockSubModel) && (
                <button
                  onClick={() => clearVIN(index)}
                  className="text-red-600 underline ml-2"
                >
                  Clear VIN
                </button>
              )}
            </div>

            {/* Lookup VIN 错误 (VIN 太短 / 解码失败) */}
            {vinErrors[index] && (
              <p className="text-red-600 text-sm mt-1">{vinErrors[index]}</p>
            )}

            {/* 页面级 VIN 错误 */}
            {getErr(index, "vin") && (
              <p className="text-red-600 text-sm mt-1">
                {getErr(index, "vin")}
              </p>
            )}
          </div>

          {/* OR */}
          <div className="flex items-center my-4">
            <div className="flex-grow border-t" />
            <span className="mx-3 text-gray-400 text-sm">OR</span>
            <div className="flex-grow border-t" />
          </div>

          {/* YEAR / MAKE / MODEL / SUBMODEL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* YEAR */}
            <div>
              <label className="text-sm font-medium text-gray-700">Year</label>
              <select
                disabled={car.lockYear}
                className={`border rounded px-3 py-2 w-full text-gray-700 ${
                  getErr(index, "ymm") ? "border-red-500" : "border-gray-300"
                } ${car.lockYear ? "bg-gray-100 text-gray-500" : ""}`}
                value={car.year}
                onChange={(e) => handleCarChange(index, "year", e.target.value)}
              >
                <option value="">Select Year</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* MAKE */}
            <div>
              <label className="text-sm font-medium text-gray-700">Make</label>
              <select
                disabled={car.lockMake || !car.year}
                className={`border rounded px-3 py-2 w-full text-gray-700 ${
                  getErr(index, "ymm") ? "border-red-500" : "border-gray-300"
                } ${car.lockMake ? "bg-gray-100 text-gray-500" : ""}`}
                value={car.make}
                onChange={(e) => {
                  handleCarChange(index, "make", e.target.value);
                  loadModels(car.year, e.target.value);
                }}
              >
                <option value="">Select Make</option>
                {makes.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* MODEL */}
            <div>
              <label className="text-sm font-medium text-gray-700">Model</label>
              <select
                disabled={car.lockModel || !car.make}
                className={`border rounded px-3 py-2 w-full text-gray-700 ${
                  getErr(index, "ymm") ? "border-red-500" : "border-gray-300"
                } ${car.lockModel ? "bg-gray-100 text-gray-500" : ""}`}
                value={car.model}
                onChange={(e) =>
                  handleCarChange(index, "model", e.target.value)
                }
              >
                <option value="">Select Model</option>

                {car.model &&
                  !(models[`${car.year}-${car.make}`] || []).includes(
                    car.model
                  ) && <option value={car.model}>{car.model}</option>}

                {(models[`${car.year}-${car.make}`] || []).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* SUBMODEL */}
            <div>
              <label className="text-sm font-medium text-gray-700">
                Sub-model / Trim
              </label>
              <select
                disabled={car.lockSubModel || !car.model}
                className={`border rounded px-3 py-2 w-full text-gray-700 ${
                  getErr(index, "ymm") ? "border-red-500" : "border-gray-300"
                } ${car.lockSubModel ? "bg-gray-100 text-gray-500" : ""}`}
                value={car.subModel}
                onChange={(e) =>
                  handleCarChange(index, "subModel", e.target.value)
                }
              >
                <option value="">Select Sub-model</option>

                {car.subModel &&
                  !["Base", "Standard", "Premium", "Sport"].includes(
                    car.subModel
                  ) && <option value={car.subModel}>{car.subModel}</option>}

                <option value="Base">Base</option>
                <option value="Standard">Standard</option>
                <option value="Premium">Premium</option>
                <option value="Sport">Sport</option>
              </select>
            </div>
          </div>

          {/* 年份/品牌/型号错误提示 */}
          {getErr(index, "ymm") && (
            <p className="text-red-600 text-sm mt-1">{getErr(index, "ymm")}</p>
          )}

          {/* OWNERSHIP */}
          <div className="mt-6">
            <label className="font-medium text-gray-800 mb-2 block">
              How do you have this vehicle?
            </label>

            {["I own it outright", "It's financed", "I lease it"].map(
              (label, i) => (
                <label
                  key={i}
                  className="flex items-center gap-2 text-gray-700"
                >
                  <input
                    type="radio"
                    name={`ownership_${index}`}
                    checked={car.ownership === i + 1}
                    onChange={() => handleCarChange(index, "ownership", i + 1)}
                    className="accent-blue-600"
                  />
                  {label}
                </label>
              )
            )}

            {getErr(index, "ownership") && (
              <p className="text-red-600 text-sm">
                {getErr(index, "ownership")}
              </p>
            )}
          </div>

          {/* USAGE */}
          <div className="mt-6">
            <label className="font-medium text-gray-800 mb-2 block">
              How do you mainly use this vehicle?
            </label>

            {[
              "Commuting to work or school",
              "Personal or leisure use",
              "For business purposes",
              "Farm or agricultural use",
            ].map((label, i) => (
              <label key={i} className="flex items-center gap-2 text-gray-700">
                <input
                  type="radio"
                  name={`usage_${index}`}
                  checked={car.usage === i + 1}
                  onChange={() => handleCarChange(index, "usage", i + 1)}
                  className="accent-blue-600"
                />
                {label}
              </label>
            ))}

            {getErr(index, "usage") && (
              <p className="text-red-600 text-sm">{getErr(index, "usage")}</p>
            )}
          </div>

          {/* MILEAGE */}
          <div className="mt-6">
            <label className="font-medium text-gray-800 mb-2 block">
              About how many miles do you drive per year?
            </label>

            {[
              "0–3,999 miles",
              "4,000–5,999 miles",
              "6,000–7,999 miles",
              "8,000–9,999 miles",
              "10,000–11,999 miles",
              "12,000+ miles",
            ].map((label, i) => (
              <label key={i} className="flex items-center gap-2 text-gray-700">
                <input
                  type="radio"
                  name={`mileage_${index}`}
                  checked={car.mileage === i + 1}
                  onChange={() => handleCarChange(index, "mileage", i + 1)}
                  className="accent-blue-600"
                />
                {label}
              </label>
            ))}

            {getErr(index, "mileage") && (
              <p className="text-red-600 text-sm">{getErr(index, "mileage")}</p>
            )}
          </div>
        </div>
      ))}

      {/* 添加车辆 */}
      <button
        onClick={() =>
          setForm({
            ...form,
            cars: [
              ...form.cars,
              {
                vin: "",
                year: "",
                make: "",
                model: "",
                subModel: "",
                ownership: 0,
                usage: 0,
                mileage: 0,
                lockYear: false,
                lockMake: false,
                lockModel: false,
                lockSubModel: false,
              },
            ],
          })
        }
        className="border px-4 py-2 rounded mt-4"
      >
        + Add Another Vehicle
      </button>

      {/* 下一步按钮 */}
      <div className="flex justify-between mt-10">
        <button onClick={prevStep} className="px-6 py-3 bg-gray-200 rounded">
          ◀ Previous Step
        </button>

        <button
          onClick={nextStep}
          className="px-6 py-3 bg-[#1EC8C8] text-white rounded hover:bg-[#19b3b3]"
        >
          Next Step ▶
        </button>
      </div>
    </div>
  );
}
