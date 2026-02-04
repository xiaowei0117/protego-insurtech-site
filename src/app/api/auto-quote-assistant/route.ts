import { NextResponse } from "next/server";

type CarInput = {
  vin?: string;
  year?: string;
  make?: string;
  model?: string;
  subModel?: string;
};

type DriverInput = {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  relationship?: string;
};

type CoverageInput = Record<string, string | number | null | undefined>;

type AutoQuoteAssistantPayload = {
  intent?: "missing_info" | "explain_price" | "recommend_coverage" | "general";
  question?: string;
  form?: {
    applicant?: {
      firstName?: string;
      lastName?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
    cars?: CarInput[];
    drivers?: DriverInput[];
    currentInsurance?: {
      hasInsurance?: string;
      provider?: string;
      duration?: string;
      bodilyInjuryLimit?: string;
      lapseDuration?: string;
    };
    contact?: {
      phone?: string;
      email?: string;
    };
    selectedPackage?: string;
    coverage?: CoverageInput;
  };
};

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const LLM_MODEL = process.env.LLM_MODEL || "llama3.1:8b";
const USE_LLM = process.env.AUTO_QUOTE_ASSISTANT_USE_LLM === "true";

function hasVehicle(cars: CarInput[] | undefined) {
  if (!cars?.length) return false;
  return cars.some((c) => {
    const vin = (c.vin || "").trim();
    const hasValidVin = vin.length === 17;
    const hasYmm =
      (c.year || "").toString().trim() &&
      (c.make || "").toString().trim() &&
      (c.model || "").toString().trim() &&
      (c.subModel || "").toString().trim();
    return hasValidVin || Boolean(hasYmm);
  });
}

function hasDrivers(drivers: DriverInput[] | undefined) {
  if (!drivers?.length) return false;
  return drivers.some(
    (d) => (d.firstName || "").trim() && (d.lastName || "").trim() && d.birthDate
  );
}

function parseAge(birthDate?: string) {
  if (!birthDate) return null;
  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const m = now.getMonth() - date.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < date.getDate())) {
    age -= 1;
  }
  return age;
}

function parseNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  const match = value.toString().replace(/,/g, "").match(/\d+/);
  return match ? Number(match[0]) : null;
}

function collectMissingFields(form: AutoQuoteAssistantPayload["form"]) {
  const missing: string[] = [];
  const applicant = form?.applicant || {};
  if (!applicant.firstName) missing.push("First name");
  if (!applicant.lastName) missing.push("Last name");
  if (!applicant.address) missing.push("Address");
  if (!applicant.city) missing.push("City");
  if (!applicant.state) missing.push("State");
  if (!applicant.zipCode) missing.push("ZIP code");

  if (!hasVehicle(form?.cars)) {
    missing.push("Vehicle info (VIN or Year/Make/Model/Sub-model)");
  }

  if (!hasDrivers(form?.drivers)) {
    missing.push("Driver name and birth date");
  }

  const insurance = form?.currentInsurance || {};
  if (!insurance.hasInsurance) {
    missing.push("Current insurance status");
  } else if (insurance.hasInsurance === "Yes") {
    if (!insurance.provider) missing.push("Current insurance provider");
    if (!insurance.duration) missing.push("Insurance duration");
    if (!insurance.bodilyInjuryLimit) missing.push("BI/PD limits");
  } else if (insurance.hasInsurance === "No") {
    if (!insurance.lapseDuration) missing.push("Lapse duration");
  }

  const contact = form?.contact || {};
  if (!contact.phone) missing.push("Phone number");
  if (!contact.email) missing.push("Email");

  const coverage = form?.coverage || {};
  const hasCoverage =
    Boolean(form?.selectedPackage) ||
    Object.values(coverage).some((v) => (v ?? "").toString().trim().length > 0);
  if (!hasCoverage) missing.push("Coverage selection");

  return missing;
}

function summarizeContext(form: AutoQuoteAssistantPayload["form"]) {
  const cars = form?.cars?.length || 0;
  const drivers = form?.drivers?.length || 0;
  const state = form?.applicant?.state || "";
  const bits = [];
  if (cars) bits.push(`${cars} vehicle${cars > 1 ? "s" : ""}`);
  if (drivers) bits.push(`${drivers} driver${drivers > 1 ? "s" : ""}`);
  if (state) bits.push(`state ${state}`);
  return bits.join(", ");
}

function buildPriceFactors(form: AutoQuoteAssistantPayload["form"]) {
  const tips: string[] = [];
  const insurance = form?.currentInsurance || {};
  if (insurance.hasInsurance === "No") {
    tips.push("No current insurance or lapse can increase premium.");
  }
  const drivers = form?.drivers || [];
  const hasYoungDriver = drivers.some((d) => {
    const age = parseAge(d.birthDate);
    return age !== null && age < 25;
  });
  if (hasYoungDriver) {
    tips.push("Younger drivers often increase premium.");
  }

  const coverage = form?.coverage || {};
  const collision = parseNumber(coverage["Collision Deductible"] as any);
  const comp = parseNumber(coverage["Comprehensive Deductible"] as any);
  if (collision !== null && collision <= 500) {
    tips.push("Lower collision deductibles can increase premium.");
  }
  if (comp !== null && comp <= 500) {
    tips.push("Lower comprehensive deductibles can increase premium.");
  }
  return tips;
}

async function maybeCallLlm(payload: {
  intent: string;
  question: string;
  summary: string;
  missing: string[];
  tips: string[];
}) {
  if (!USE_LLM) return null;
  const prompt = `
You are an auto insurance quote assistant. Be concise and helpful.
Use the provided context. If key info is missing, ask for it.

Intent: ${payload.intent}
Question: ${payload.question || "N/A"}
Context summary: ${payload.summary || "N/A"}
Missing fields: ${payload.missing.join(", ") || "None"}
Price factors: ${payload.tips.join(" ") || "None"}

Reply with:
- Answer: one short paragraph
- Follow-ups: bullet list of missing items to ask the user
`.trim();

  const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: LLM_MODEL,
      prompt,
      stream: false,
      options: { temperature: 0.2 },
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.response || null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AutoQuoteAssistantPayload;
    const intent = body.intent || "general";
    const question = body.question || "";
    const form = body.form || {};

    const missing = collectMissingFields(form);
    const summary = summarizeContext(form);
    const priceTips = buildPriceFactors(form);

    let answer = "I can help you complete the quote and explain coverage.";
    let actions = [
      { id: "missing_info", label: "Review missing info" },
      { id: "explain_price", label: "Why is my quote higher?" },
      { id: "recommend_coverage", label: "Recommend coverage package" },
    ];

    if (intent === "missing_info") {
      answer = missing.length
        ? "I found a few items that may be missing. Please add them to continue."
        : "Your quote info looks complete so far.";
    } else if (intent === "explain_price") {
      answer = priceTips.length
        ? "Here are the most likely factors affecting your price."
        : "I need a bit more information to explain the price accurately.";
    } else if (intent === "recommend_coverage") {
      answer =
        "I can recommend a package once I know your driving history and budget.";
    } else if (question) {
      answer = "Thanks for the question. I can help with coverage and pricing.";
    }

    const llm = await maybeCallLlm({
      intent,
      question,
      summary,
      missing,
      tips: priceTips,
    });

    return NextResponse.json({
      answer,
      intent,
      summary,
      missingFields: missing,
      priceFactors: priceTips,
      actions,
      llm,
      confidence: missing.length ? "low" : priceTips.length ? "medium" : "high",
    });
  } catch (err: any) {
    console.error("auto-quote-assistant error:", err);
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
