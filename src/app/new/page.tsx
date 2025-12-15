"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { FormData, Driver } from "@/types/formData";

import StepApplicant from "@/app/new/steps/StepApplicant";
import StepCars from "@/app/new/steps/StepCars";
import StepDrivers from "@/app/new/steps/StepDrivers";
import StepPriorIns from "@/app/new/steps/StepPriorIns";
import StepCoverage from "@/app/new/steps/StepCoverage";

import { validateZip } from "@/utils/geo";

const OCCUPATIONS = [
  "Software Developer",
  "Engineer",
  "Teacher",
  "Doctor",
  "Nurse",
  "Lawyer",
  "Driver",
  "Salesperson",
  "Manager",
  "Technician",
  "Accountant",
  "Designer",
  "Architect",
  "Police Officer",
  "Firefighter",
  "Military",
  "Student",
  "Homemaker",
  "Retired",
  "Unemployed",
  "Other",
];

const EMPTY_COVERAGE = {
  "Bodily Injury Liability": "",
  "Property Damage": "",
  "Uninsured/Underinsured Motorist Bodily Injury": "",
  "Uninsured/Underinsured Property Damage": "",
  "Medical Payment": "",
  "Personal Injury Protection": "",
  "Comprehensive Deductible": "",
  "Collision Deductible": "",
  Rental: "",
  Roadside: "",
};

function createEmptyForm(): FormData {
  return {
    firstName: "",
    lastName: "",
    birthDate: "",
    address: "",
    unit: "",
    city: "",
    state: "",
    zipCode: "",
    gender: "",
    residence: "",

    maritalStatus: "",
    drivers: [
      {
        firstName: "",
        lastName: "",
        birthDate: "",
        relationship: "Self",
        maritalStatus: "",
        occupation: "",
        education: "",
        dlNumber: "",
        dlState: "",
      },
    ],
    occupation: "",
    education: "",
    married: false,

    spouseFirstName: "",
    spouseLastName: "",
    spouseBirthDate: "",
    spouseEducation: "",
    spouseOccupation: "",

    currentInsurance: {
      hasInsurance: "",
      provider: "",
      duration: "",
      bodilyInjuryLimit: "",
      lapseDuration: "",
    },
    contact: {
      phone: "",
      email: "",
    },
    selectedPackage: "",
    coverage: { ...EMPTY_COVERAGE },
    cars: [
      {
        vin: "",
        year: "",
        make: "",
        model: "",
        subModel: "",
        ownership: 0,
        usage: 0,
        mileage: 0,
      },
    ],
  };
}

function mapApplicantToForm(applicant: any): FormData {
  const coverageRow = applicant.coverage_configs || {};
  const rawCoverage = coverageRow?.extra?.rawCoverage || {};

  const rawDrivers =
    applicant.drivers?.length > 0
      ? applicant.drivers.map((d: any) => ({
          firstName: d.first_name || "",
          lastName: d.last_name || "",
          birthDate: d.birth_date ? d.birth_date.slice(0, 10) : "",
          relationship: d.relationship || "",
          maritalStatus: d.marital_status || "",
          occupation: d.occupation || "",
          education: d.education || "",
          dlNumber: d.dl_number || "",
          dlState: d.dl_state || "",
        }))
      : [
          {
            firstName: "",
            lastName: "",
            birthDate: "",
            relationship: "Self",
            maritalStatus: "",
            occupation: "",
            education: "",
            dlNumber: "",
            dlState: "",
          },
        ];

  // Ensure driver ordering: primary Self first, spouse second, others after
  const primaryDriver =
    rawDrivers.find((d) => d.relationship === "Self") || rawDrivers[0];
  const spouseDriverRel = rawDrivers.find((d) => d.relationship === "Spouse");
  const otherDrivers = rawDrivers.filter(
    (d) => d !== primaryDriver && d !== spouseDriverRel
  );
  const drivers = [primaryDriver, ...(spouseDriverRel ? [spouseDriverRel] : []), ...otherDrivers];

  const spouseDriver =
    applicant.marital_status === "Married"
      ? drivers.find((d) => d.relationship === "Spouse") || drivers[1]
      : null;

  return {
    applicantId: applicant.id,
    firstName: applicant.first_name || "",
    lastName: applicant.last_name || "",
    birthDate: applicant.birth_date
      ? applicant.birth_date.slice(0, 10)
      : "",
    address: applicant.address || "",
    unit: applicant.unit || "",
    city: applicant.city || "",
    state: applicant.state || "",
    zipCode: applicant.zip_code || "",
    gender: applicant.gender || "",
    residence: applicant.residence || "",

    maritalStatus: applicant.marital_status || "",
    drivers,
    occupation: applicant.occupation || drivers[0]?.occupation || "",
    education: applicant.education || drivers[0]?.education || "",
    married: applicant.marital_status === "Married",

    spouseFirstName:
      applicant.extra?.spouseFirstName || spouseDriver?.firstName || "",
    spouseLastName:
      applicant.extra?.spouseLastName || spouseDriver?.lastName || "",
    spouseBirthDate:
      applicant.extra?.spouseBirthDate ||
      (spouseDriver?.birthDate ? spouseDriver.birthDate : ""),
    spouseEducation:
      applicant.extra?.spouseEducation ||
      (applicant.marital_status === "Married"
        ? spouseDriver?.education || ""
        : ""),
    spouseOccupation:
      applicant.extra?.spouseOccupation ||
      (applicant.marital_status === "Married"
        ? spouseDriver?.occupation || ""
        : ""),

    currentInsurance: {
      hasInsurance: applicant.current_insurance?.has_insurance || "",
      provider: applicant.current_insurance?.provider || "",
      duration: applicant.current_insurance?.duration || "",
      bodilyInjuryLimit: applicant.current_insurance?.bodily_injury_limit || "",
      lapseDuration: applicant.current_insurance?.lapse_duration || "",
    },
    contact: {
      phone: applicant.phone || "",
      email: applicant.email || "",
    },
    selectedPackage: coverageRow?.extra?.selectedPackage || "",
    coverage: {
      ...EMPTY_COVERAGE,
      ...(rawCoverage || {}),
      "Bodily Injury Liability": coverageRow?.bi_pd_liability || rawCoverage?.["Bodily Injury Liability"] || "",
      "Uninsured/Underinsured Motorist Bodily Injury":
        coverageRow?.uninsured_motorist ||
        rawCoverage?.["Uninsured/Underinsured Motorist Bodily Injury"] ||
        "",
      "Personal Injury Protection":
        coverageRow?.pip ||
        rawCoverage?.["Personal Injury Protection"] ||
        "",
      "Collision Deductible":
        coverageRow?.collision ||
        rawCoverage?.["Collision Deductible"] ||
        "",
      "Comprehensive Deductible":
        coverageRow?.comprehensive ||
        rawCoverage?.["Comprehensive Deductible"] ||
        "",
      Rental: coverageRow?.rental || rawCoverage?.Rental || "",
      Roadside: coverageRow?.roadside_assistance || rawCoverage?.Roadside || "",
    },
    cars:
      applicant.vehicles?.length > 0
        ? applicant.vehicles.map((v: any) => ({
            vin: v.vin || "",
            year: v.year || "",
            make: v.make || "",
            model: v.model || "",
            subModel: v.sub_model || "",
            ownership: Number(v.ownership || 0),
            usage: Number(v.usage || 0),
            mileage: Number(v.mileage || 0),
          }))
        : [
            {
              vin: "",
              year: "",
              make: "",
              model: "",
              subModel: "",
              ownership: 0,
              usage: 0,
              mileage: 0,
            },
          ],
  };
}

function computeCompletedSteps(form: FormData) {
  const completed: number[] = [];

  if (
    form.firstName &&
    form.lastName &&
    form.address &&
    form.city &&
    form.state &&
    form.zipCode
  ) {
    completed.push(1);
  }

  const hasVehicle =
    form.cars?.length &&
    form.cars.some(
      (c) =>
        (c.vin && c.vin.length === 17) ||
        (c.year && c.make && c.model && c.subModel)
    );
  if (hasVehicle) completed.push(2);

  const hasDrivers =
    form.drivers?.length &&
    form.drivers.some(
      (d) => d.firstName && d.lastName && d.birthDate
    );
  if (hasDrivers) completed.push(3);

  if (
    form.currentInsurance.hasInsurance ||
    form.contact.phone ||
    form.contact.email
  ) {
    completed.push(4);
  }

  const hasCoverage =
    form.selectedPackage ||
    Object.values(form.coverage).some((v) => (v || "").toString().length > 0);
  if (hasCoverage) completed.push(5);

  return completed;
}

export default function NewQuotePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [touchedSteps, setTouchedSteps] = useState<number[]>([]);

  // Step 2 — Vehicle API
  const [years, setYears] = useState<number[]>([]);
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<Record<string, string[]>>({});
  const [subModels, setSubModels] = useState<Record<string, string[]>>({});

  // ====== 加载车数据 ======
  useEffect(() => {
    // 加载年分（2000–2025）
    const yearList = Array.from({ length: 30 }, (_, i) => 2025 - i);
    setYears(yearList);

    // 加载所有 makes
    async function fetchMakes() {
      const res = await fetch(
        "https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/passenger%20car?format=json"
      );
      const data = await res.json();
      setMakes(data.Results.map((m: any) => m.MakeName)); // 注意字段是 MakeName
    }

    fetchMakes();
  }, []);

  async function loadModels(year: string, make: string) {
    if (!year || !make) return;

    const key = `${year}-${make}`;
    if (models[key]) return; // 已经加载过

    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${make}/modelyear/${year}?format=json`
    );
    const data = await res.json();

    const list = data.Results.map((m: any) => m.Model_Name);

    setModels((prev) => ({ ...prev, [key]: list }));
  }

  async function postStepData(stepNumber: number, data: any) {
    const key = xrefKey || crypto.randomUUID();
    if (!xrefKey) setXrefKey(key);

    const payload = {
      step: stepNumber,
      applicantId: form.applicantId || applicantId || null,
      xrefKey: key,
      data,
    };

    const res = await fetch("/api/applicants/save-step", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || `Failed to save step ${stepNumber}`);
    }

    const finalId = result.applicantId || payload.applicantId || null;

    if (finalId) {
      setForm((prev: any) => ({
        ...prev,
        applicantId: finalId,
      }));
      setApplicantId(finalId);
      persistSession(finalId, key);
    }

    return finalId;
  }

  async function saveStep1ToDB() {
    return postStepData(1, {
      first_name: form.firstName,
      last_name: form.lastName,
      birth_date: form.birthDate || null,
      gender: form.gender,
      marital_status: form.maritalStatus,
      address: form.address,
      unit: form.unit,
      city: form.city,
      state: form.state,
      zip_code: form.zipCode,
      residence: form.residence,
      phone: form.contact.phone,
      email: form.contact.email,
    });
  }

  async function saveStep2ToDB() {
    const vehicles = form.cars.map((car) => ({
      vin: car.vin || null,
      year: car.year || null,
      make: car.make || null,
      model: car.model || null,
      sub_model: car.subModel || null,
      ownership: car.ownership ? String(car.ownership) : null,
      usage: car.usage ? String(car.usage) : null,
      mileage: car.mileage ? String(car.mileage) : null,
    }));

    return postStepData(2, vehicles);
  }

  async function saveStep3ToDB() {
    const drivers = form.drivers.map((driver: Driver) => ({
      first_name: driver.firstName,
      last_name: driver.lastName,
      birth_date: driver.birthDate || null,
      relationship: driver.relationship,
      marital_status: driver.maritalStatus,
      occupation: driver.occupation,
      education: driver.education,
      dl_number: driver.dlNumber,
      dl_state: driver.dlState,
    }));

    const id = await postStepData(3, drivers);

    // Keep applicant's marital_status/occupation/education in sync when edited in Step 3
    await saveStep1ToDB();

    return id;
  }

  async function saveStep4ToDB() {
    const insurance = form.currentInsurance;

    // 确保已有 applicantId（若缺失则先创建）
    if (!form.applicantId && !applicantId) {
      await saveStep1ToDB();
    }

    await postStepData(4, {
      has_insurance: insurance.hasInsurance || null,
      provider: insurance.provider || null,
      duration: insurance.duration || null,
      bodily_injury_limit: insurance.bodilyInjuryLimit || null,
      lapse_duration: insurance.lapseDuration || null,
    });

    // 联系方式 + 申请人基本信息同步
    await saveStep1ToDB();
  }

  async function saveStep5ToDB() {
    const cov = form.coverage;

    return postStepData(5, {
      bi_pd_liability: cov["Bodily Injury Liability"] || null,
      uninsured_motorist:
        cov["Uninsured/Underinsured Motorist Bodily Injury"] || null,
      pip: cov["Personal Injury Protection"] || null,
      collision: cov["Collision Deductible"] || null,
      comprehensive: cov["Comprehensive Deductible"] || null,
      rental: cov["Rental"] || null,
      roadside_assistance: cov["Roadside"] || null,
      extra: {
        property_damage: cov["Property Damage"] || null,
        uninsured_property_damage:
          cov["Uninsured/Underinsured Property Damage"] || null,
        medical_payment: cov["Medical Payment"] || null,
        selectedPackage: form.selectedPackage,
        rawCoverage: cov,
      },
    });
  }

  // ====== Coverage Presets ======
  const COVERAGE_PRESETS = {
    Basic: {
      "Bodily Injury Liability": "30k/60k",
      "Property Damage": "25k",
      "Uninsured/Underinsured Motorist Bodily Injury": "30k/60k",
      "Uninsured/Underinsured Property Damage": "25k",
      "Medical Payment": "500",
      "Personal Injury Protection": "2,500",
      "Comprehensive Deductible": "—",
      "Collision Deductible": "—",
      Rental: "",
      Roadside: "",
    },
    Standard: {
      "Bodily Injury Liability": "100k/300k",
      "Property Damage": "100k",
      "Uninsured/Underinsured Motorist Bodily Injury": "30k/60k",
      "Uninsured/Underinsured Property Damage": "25k",
      "Medical Payment": "1,000",
      "Personal Injury Protection": "2,500",
      "Comprehensive Deductible": "1,000",
      "Collision Deductible": "1,000",
      Rental: "30/day, 900 max",
      Roadside: "Included",
    },
    Good: {
      "Bodily Injury Liability": "250k/500k",
      "Property Damage": "250k",
      "Uninsured/Underinsured Motorist Bodily Injury": "50k/100k",
      "Uninsured/Underinsured Property Damage": "50k",
      "Medical Payment": "5,000",
      "Personal Injury Protection": "10,000",
      "Comprehensive Deductible": "500",
      "Collision Deductible": "500",
      Rental: "50/day, 900 max",
      Roadside: "Included",
    },
  };

  // ====== 全局状态 ======
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newlyAddedDrivers, setNewlyAddedDrivers] = useState<number[]>([]);
  const [applicantId, setApplicantId] = useState<number | null>(null);
  const [xrefKey, setXrefKey] = useState<string | null>(null);
  const [isReopen, setIsReopen] = useState(false);
  const [dualApplicantQuotes, setDualApplicantQuotes] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [lastQuotePayload, setLastQuotePayload] = useState<any | null>(null);
  const [savingQuote, setSavingQuote] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(() => createEmptyForm());

  const persistSession = useCallback((id: number | null, key: string | null) => {
    if (typeof window === "undefined") return;
    if (!id) return;
    localStorage.setItem(
      "applicantSession",
      JSON.stringify({ applicantId: id, xrefKey: key })
    );
  }, []);

  const clearSession = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("applicantSession");
  }, []);

  const restoreApplicant = useCallback(
    async (id?: number | null, xKey?: string | null) => {
      try {
        let res: Response | null = null;

        if (id) {
          res = await fetch(`/api/applicants/${id}`);
        } else if (xKey) {
          res = await fetch(`/api/applicants/by-xref/${xKey}`);
        }

        if (!res || !res.ok) {
          clearSession();
          return;
        }

        const applicant = await res.json();
        const mapped = mapApplicantToForm(applicant);

        setForm(mapped);
        setApplicantId(applicant.id);

        if (applicant.xref_key) setXrefKey(applicant.xref_key);

        const alreadyCompleted = computeCompletedSteps(mapped);
        setTouchedSteps(alreadyCompleted);
        setCompletedSteps(alreadyCompleted);

        const nextStep =
          alreadyCompleted.length === 5
            ? 5
            : Math.max(1, alreadyCompleted.length + 1);
        setStep(nextStep);

        persistSession(
          applicant.id,
          applicant.xref_key || xKey || null
        );
      } catch (err) {
        console.error("restoreApplicant error", err);
        clearSession();
      }
    },
    [clearSession, persistSession]
  );

  // ====== 恢复本地会话（applicantId / xrefKey）=====
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isFresh = searchParams?.get("fresh");
    if (isFresh) {
      clearSession();
      setForm(createEmptyForm());
      setApplicantId(null);
      setXrefKey(null);
      setIsReopen(false);
      setTouchedSteps([]);
      setCompletedSteps([]);
      setStep(1);
      setResult(null);
      setLastQuotePayload(null);
      setSaveMessage(null);
      return;
    }

    const applicantIdParam = searchParams?.get("applicantId");
    const xrefParam = searchParams?.get("xref");
    if (applicantIdParam || xrefParam) {
      setIsReopen(true);
      if (xrefParam) setXrefKey(xrefParam);
      if (applicantIdParam) {
        restoreApplicant(Number(applicantIdParam), xrefParam || null);
      } else if (xrefParam) {
        restoreApplicant(null, xrefParam);
      }
      return;
    }

    setIsReopen(false);

    const savedRaw = localStorage.getItem("applicantSession");
    let saved: any = null;
    try {
      saved = savedRaw ? JSON.parse(savedRaw) : null;
    } catch (err) {
      console.warn("failed to parse saved session");
    }

    let key = saved?.xrefKey || null;
    if (!key) key = crypto.randomUUID();
    setXrefKey(key);

    if (saved?.applicantId) {
      restoreApplicant(Number(saved.applicantId), key);
    } else if (key) {
      restoreApplicant(null, key);
    }
  }, [restoreApplicant, searchParams, clearSession]);

  // ======= validate additional driver =======
  function validateDriver(driver: Driver, index: number) {
    const errors: any = {};
    const key = (f: string) => `driver_${index}_${f}`;

    const isPrimary = index === 1; // driver_1
    const isSpouse = index === 2 && form.maritalStatus === "Married";
    const isAdditional = !isPrimary && !isSpouse;

    // All drivers must have these
    if (!driver.firstName?.trim())
      errors[key("firstName")] = "First name is required";
    if (!driver.lastName?.trim())
      errors[key("lastName")] = "Last name is required";
    if (!driver.birthDate) errors[key("birthDate")] = "Birth date is required";

    // Relationship / maritalStatus:
    // Primary always has relationship="Self"
    // Spouse auto = "Spouse"
    if (!isPrimary && !isSpouse) {
      if (!driver.relationship)
        errors[key("relationship")] = "Relationship is required";
      if (!driver.maritalStatus)
        errors[key("maritalStatus")] = "Marital status is required";
    }

    // Education & Occupation only required for Primary + Spouse
    if (isPrimary || isSpouse) {
      if (!driver.occupation?.trim())
        errors[key("occupation")] = "Occupation is required";
      if (!driver.education?.trim())
        errors[key("education")] = "Education is required";
    }

    // DL required for ALL drivers
    //if (!driver.dlNumber?.trim())
    //  errors[key("dlNumber")] = "DL Number is required";
    //if (!driver.dlState) errors[key("dlState")] = "DL State is required";

    return errors;
  }

  // ====== logic validation ======
  const validateStep = useCallback(
    (currentStep: number) => {
      const newErrors: Record<string, string> = {};

      if (currentStep === 1) {
        if (!form.firstName.trim())
          newErrors.firstName = "First name is required";
        if (!form.lastName.trim()) newErrors.lastName = "Last name is required";
        if (!form.address.trim()) newErrors.address = "Address is required";
        if (!form.city.trim()) newErrors.city = "City is required";
        if (!form.state) newErrors.state = "Please select a state";

        // birth date validation ...

        // zip code validation
        const zip = (form.zipCode ?? "").trim();
        const zipError = validateZip(form.state, zip);
        if (zipError) newErrors.zipCode = zipError;

        // gender, residence ...
      }

      if (currentStep === 2) {
        form.cars.forEach((car, i) => {
          const prefix = `car_${i}`;

          const vin = car.vin.trim();
          const hasVIN = vin.length > 0;
          const hasValidVIN = vin.length === 17;
          const hasYMM =
            car.year.trim() &&
            car.make.trim() &&
            car.model.trim() &&
            car.subModel.trim();

          if (hasVIN && !hasValidVIN) {
            newErrors[`${prefix}_vin`] =
              "VIN must be 17 characters (letters or numbers).";
          }

          // Rule: MUST have valid VIN OR Y/MM/M/submodel
          if (!hasValidVIN && !hasYMM) {
            if (!newErrors[`${prefix}_vin`]) {
              newErrors[`${prefix}_vin`] =
                "Please enter VIN OR complete Year/Make/Model/Sub-model.";
            }
            newErrors[`${prefix}_ymm`] =
              "Please complete Year/Make/Model/Sub-model OR enter VIN.";
          }

          // ownership required
          if (!car.ownership) {
            newErrors[`${prefix}_ownership`] = "Please select ownership.";
          }

          // usage required
          if (!car.usage) {
            newErrors[`${prefix}_usage`] = "Please select usage.";
          }

          // mileage required
          if (!car.mileage) {
            newErrors[`${prefix}_mileage`] = "Please select mileage.";
          }
        });
      }

      if (currentStep === 3) {
        form.drivers.forEach((driver, i) => {
          const err = validateDriver(driver, i + 1);
          console.log("🧪 driver", i, driver);
          console.log("🧪 validateDriver return:", err);

          Object.assign(newErrors, err);
        });
      }

      if (currentStep === 4) {
        const { currentInsurance, contact } = form;

        if (!currentInsurance.hasInsurance) {
          newErrors.hasInsurance =
            "Please select if you are currently insured.";
        } else if (currentInsurance.hasInsurance === "Yes") {
          if (!currentInsurance.provider.trim()) {
            newErrors.provider = "Provider is required.";
          }
          if (!currentInsurance.duration) {
            newErrors.duration =
              "Please select how long you have been insured.";
          }
          if (!currentInsurance.bodilyInjuryLimit) {
            newErrors.bodilyInjuryLimit = "Please select your BI/PD limits.";
          }
        } else if (currentInsurance.hasInsurance === "No") {
          if (!currentInsurance.lapseDuration) {
            newErrors.lapseDuration = "Please select a lapse duration.";
          }
        }

        const phone = (contact.phone ?? "").trim();
        const digitsOnly = phone.replace(/\D/g, "");
        if (!phone) {
          newErrors.contact_phone = "Phone number is required.";
        } else if (digitsOnly.length < 10) {
          newErrors.contact_phone = "Please enter a valid phone number.";
        }

        const email = (contact.email ?? "").trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
          newErrors.contact_email = "Email is required.";
        } else if (!emailRegex.test(email)) {
          newErrors.contact_email = "Please enter a valid email.";
        }
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [form]
  );
  useEffect(() => {
    const validSteps: number[] = [];

    for (let s = 1; s <= steps.length; s++) {
      if (touchedSteps.includes(s) && validateStep(s)) {
        validSteps.push(s);
      } else if (!touchedSteps.includes(s)) {
        continue;
      } else {
        break;
      }
    }

    setCompletedSteps(validSteps);
  }, [form, touchedSteps, validateStep]);

  // ====== step title ======
  const steps = ["About You", "Car", "Drivers", "Discount Applied", "Coverage"];

  // ===== handle input car information =====
  function handleCarChange(index: number, field: string, value: string) {
    const updatedCars = [...form.cars]; // copy current cars
    (updatedCars[index] as any)[field] = value; // update designated car
    setForm({ ...form, cars: updatedCars }); // update car status
  }

  // ====== 按钮逻辑 ======
  const nextStep = useCallback(async () => {
    console.log("🚀 nextStep clicked");
    console.log("📌 before step =", step);

    setTouchedSteps((prev) => (prev.includes(step) ? prev : [...prev, step]));

    const isValid = validateStep(step === 3 ? 3 : step);
    if (!isValid) return;

    try {
      if (step === 1) {
        await saveStep1ToDB();
      } else if (step === 2) {
        await saveStep2ToDB();
      } else if (step === 3) {
        await saveStep3ToDB();
        setNewlyAddedDrivers([]);
      } else if (step === 4) {
        await saveStep4ToDB();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to save step data.");
      return;
    }

    setStep((s) => Math.min(s + 1, 5));
  }, [
    step,
    validateStep,
    saveStep1ToDB,
    saveStep2ToDB,
    saveStep3ToDB,
    saveStep4ToDB,
  ]);

  const prevStep = useCallback(() => {
    console.log("⬅ previous step clicked");
    setStep((s) => Math.max(s - 1, 1));
  }, []);

  // ====== 发起报价请求 ======
  async function handleGetQuotes(submitMode: "create" | "submitQuote") {
    setError(null);
    setLoading(true);
    setResult(null);
    setSaveMessage(null);

    try {
      await saveStep5ToDB();

      const useXrefKey = xrefKey || crypto.randomUUID();
      if (!xrefKey) setXrefKey(useXrefKey);
      if (form.applicantId || applicantId)
        persistSession(form.applicantId || applicantId, useXrefKey);

      const contactEmail = (form.contact.email || "").trim().toLowerCase();
      let shouldSave = false;

      if (contactEmail) {
        try {
          const existsRes = await fetch("/api/users/exists", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: contactEmail }),
          });
          if (existsRes.ok) {
            const existsJson = await existsRes.json();
            shouldSave = Boolean(existsJson?.exists);
          }
        } catch {
          shouldSave = false;
        }
      }

      const spousePayload =
        dualApplicantQuotes && form.maritalStatus === "Married"
          ? {
              firstName: form.spouseFirstName,
              lastName: form.spouseLastName,
              birthDate: form.spouseBirthDate,
              occupation: form.spouseOccupation,
              education: form.spouseEducation,
              phone: form.contact.phone,
              email: form.contact.email,
            }
          : null;

      const payload = {
        submitMode,
        xrefKey: useXrefKey,
        applicantId: form.applicantId || applicantId || null,
        dualApplicantQuotes,
        spouse: spousePayload,
        applicant: {
          firstName: form.firstName,
          lastName: form.lastName,
          birthDate: form.birthDate,
          address: form.address,
          unit: form.unit,
          city: form.city,
          state: form.state,
          zipCode: form.zipCode,
          gender: form.gender,
          maritalStatus: form.maritalStatus,
          residence: form.residence,
        },

        vehicles: form.cars.map((car) => ({
          vin: car.vin,
          year: car.year,
          make: car.make,
          model: car.model,
          subModel: car.subModel,
          ownership: car.ownership,
          usage: car.usage,
          mileage: car.mileage,
        })),

        drivers: form.drivers.map((driver, idx) => ({
          firstName: driver.firstName,
          lastName: driver.lastName,
          birthDate: driver.birthDate,
          relationship: driver.relationship,
          maritalStatus: driver.maritalStatus,
          occupation:
            driver.occupation ||
            (idx === 0 ? form.occupation : idx === 1 ? form.spouseOccupation : ""),
          education:
            driver.education ||
            (idx === 0 ? form.education : idx === 1 ? form.spouseEducation : ""),
          dlNumber: driver.dlNumber || "",
          dlState: driver.dlState || "",
        })),

        contact: {
          phone: form.contact.phone || "",
          email: form.contact.email || "",
        },

        selectedPackage: form.selectedPackage,
        coverage: form.coverage,
        // Force mock quotes until EZLynx sandbox is available
        mock: true,
        save: shouldSave,
      };

      setLastQuotePayload(payload);

      const res = await fetch("/api/quotes/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        throw new Error(msg?.error || "Quote search failed");
      }

      const data = await res.json();

      const query = new URLSearchParams();
      let cacheKey: string | null = null;
      if (!shouldSave) {
        cacheKey = `quote_result_${Date.now()}`;
        if (typeof window !== "undefined") {
          try {
            window.sessionStorage.setItem(
              cacheKey,
              JSON.stringify({
                payload,
                result: data,
              })
            );
          } catch {
            // ignore storage errors
          }
        }
      }
      if (data?.execId) query.set("exec", data.execId);
      if (cacheKey) query.set("key", cacheKey);
      query.set("save", shouldSave ? "true" : "false");
      router.push(`/quotes/result?${query.toString()}`);
    } catch (err: any) {
      setError(err.message || "Failed to get quotes");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveQuote() {
    if (!lastQuotePayload) {
      setError("Please get a quote first.");
      return;
    }
    setSavingQuote(true);
    setError(null);
    setSaveMessage(null);

    try {
      const res = await fetch("/api/quotes/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lastQuotePayload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to save quote");
      }
      setSaveMessage("Quote saved. Sign in to view or edit anytime.");
      // keep latest result for display
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to save quote");
    } finally {
      setSavingQuote(false);
    }
  }

  // ====== 页面渲染 ======
  return (
    <main className="flex min-h-screen bg-gray-50">
      {/* 左侧步骤栏 */}
      <aside className="relative w-64 border-r bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-6">
          Quote Steps
        </h2>

        <div className="relative">
          {/* 蓝色进度竖条 */}
          <div
            className="absolute left-0 top-0 w-1 bg-[#1EC8C8] rounded-full transition-all duration-500"
            style={{ height: `${(step / steps.length) * 100}%` }}
          ></div>

          <div className="space-y-2 pl-4">
            {steps.map((label, idx) => {
              const stepNumber = idx + 1;
              const isCurrent = step === stepNumber;

              // ✅ 从 state 读取哪些步骤完成
              const isCompleted = completedSteps.includes(stepNumber);
              const canClick =
                stepNumber <= step || completedSteps.includes(stepNumber - 1);

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (canClick) {
                      setStep(stepNumber);
                    }
                  }}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200
              ${
                isCurrent
                  ? "bg-[#e6fafa] text-[#0b6f6f] font-medium"
                  : canClick
                  ? "text-gray-700 hover:bg-gray-100 cursor-pointer"
                  : "text-gray-400 cursor-not-allowed opacity-60"
              }
            `}
                >
                  <span
                    className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold
                ${
                  isCompleted
                    ? "bg-[#1EC8C8] text-white"
                    : isCurrent
                    ? "bg-[#19b3b3] text-white"
                    : "bg-gray-200 text-gray-700"
                }
              `}
                  >
                    {isCompleted ? "✓" : stepNumber}
                  </span>

                  <span>
                    Step {stepNumber}: {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* 右侧表单区域 */}
      <section className="flex-1 p-8">
        {/* ===== Step 1: Applicant Information ===== */}
        {step === 1 && (
          <StepApplicant
            form={form}
            setForm={setForm}
            errors={errors}
            touchedSteps={touchedSteps}
            step={step}
            nextStep={nextStep}
          />
        )}

        {/* ===== Step 2: Car Information ===== */}
        {step === 2 && (
          <StepCars
            form={form}
            setForm={setForm}
            errors={errors}
            years={years}
            makes={makes}
            models={models}
            loadModels={loadModels}
            handleCarChange={handleCarChange}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        )}

        {/* ===== Step 3: Drivers ===== */}
        {step === 3 && (
          <>
            <StepDrivers
              form={form}
              setForm={setForm}
              errors={errors}
              OCCUPATIONS={OCCUPATIONS}
            />

            {/* Step 3 Navigation Buttons */}
            <div className="flex justify-between mt-6">
              <button
                type="button"
                className="px-4 py-2 border rounded"
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
          </>
        )}

        {/* ===== Step 4: Current Insurance & Contacts ===== */}
        {step === 4 && (
          <StepPriorIns
            form={form}
            setForm={setForm}
            errors={errors}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        )}

        {step === 5 && (
          <StepCoverage
            form={form}
            setForm={setForm}
            COVERAGE_PRESETS={COVERAGE_PRESETS}
            loading={loading}
            error={error}
            result={result}
            handleGetQuotes={handleGetQuotes}
            handleSaveQuote={handleSaveQuote}
            savingQuote={savingQuote}
            canSave={Boolean(lastQuotePayload)}
            saveMessage={saveMessage}
            isReopen={isReopen}
            dualApplicantQuotes={dualApplicantQuotes}
            setDualApplicantQuotes={setDualApplicantQuotes}
          />
        )}
      </section>
    </main>
  );
}
