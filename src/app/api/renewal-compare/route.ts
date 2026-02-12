import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExtractedDoc = {
  text: string;
  premium: number | null;
  coverages: Record<string, string>;
  docType: "auto" | "homeowners" | "dwelling_fire" | "unknown";
};

const COVERAGE_TEMPLATES: Record<
  ExtractedDoc["docType"],
  Array<{ key: string; label: string; regex: RegExp }>
> = {
  auto: [
    { key: "bodily_injury", label: "Bodily Injury", regex: /bodily injury|\\bbi\\b/i },
    { key: "property_damage", label: "Property Damage", regex: /property damage|\\bpd\\b/i },
    { key: "medical", label: "Medical Payments", regex: /medical payments|med pay|medpay/i },
    { key: "uninsured", label: "Uninsured Motorist", regex: /uninsured motorist|\\bum\\b/i },
    { key: "underinsured", label: "Underinsured Motorist", regex: /underinsured motorist|\\buim\\b/i },
    { key: "pip", label: "PIP", regex: /personal injury protection|\\bpip\\b/i },
    { key: "collision", label: "Collision", regex: /collision/i },
    { key: "comprehensive", label: "Comprehensive", regex: /comprehensive/i },
    { key: "rental", label: "Rental", regex: /rental/i },
    { key: "roadside", label: "Roadside", regex: /roadside|towing/i },
    { key: "deductible", label: "Deductible", regex: /deductible/i },
  ],
  homeowners: [
    { key: "coverage_a", label: "Coverage A (Dwelling)", regex: /coverage\\s*a\\b|dwelling\\b/i },
    { key: "coverage_b", label: "Coverage B (Other Structures)", regex: /coverage\\s*b\\b|other structures/i },
    { key: "coverage_c", label: "Coverage C (Personal Property)", regex: /coverage\\s*c\\b|personal property/i },
    { key: "coverage_d", label: "Coverage D (Loss of Use)", regex: /coverage\\s*d\\b|loss of use|additional living expense/i },
    { key: "liability", label: "Personal Liability", regex: /personal liability|liability/i },
    { key: "med_pay", label: "Medical Payments", regex: /medical payments|med pay|medpay/i },
    { key: "deductible", label: "Deductible", regex: /deductible/i },
    { key: "wind_hail", label: "Wind/Hail Deductible", regex: /wind.*hail|hail.*wind/i },
  ],
  dwelling_fire: [
    { key: "coverage_a", label: "Coverage A (Dwelling)", regex: /coverage\\s*a\\b|dwelling\\b/i },
    { key: "coverage_b", label: "Coverage B (Other Structures)", regex: /coverage\\s*b\\b|other structures/i },
    { key: "coverage_c", label: "Coverage C (Personal Property)", regex: /coverage\\s*c\\b|personal property/i },
    { key: "coverage_d", label: "Coverage D (Loss of Use)", regex: /coverage\\s*d\\b|loss of use|fair rental value/i },
    { key: "liability", label: "Personal Liability", regex: /personal liability|liability/i },
    { key: "med_pay", label: "Medical Payments", regex: /medical payments|med pay|medpay/i },
    { key: "deductible", label: "Deductible", regex: /deductible/i },
  ],
  unknown: [],
};

function safeNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeLine(line: string) {
  return line.replace(/\s+/g, " ").trim();
}

function extractNumericTokens(line: string) {
  const tokens: string[] = [];
  const currencyMatches = line.match(/\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g);
  if (currencyMatches) {
    tokens.push(...currencyMatches);
  }
  const ratioMatches = line.match(/\d{1,3}\/\d{1,3}(?:,\d{3})?/g);
  if (ratioMatches) {
    tokens.push(...ratioMatches);
  }
  return tokens;
}

function pickCoverageValue(line: string) {
  const tokens = extractNumericTokens(line);
  if (!tokens.length) return "";
  const ratio = tokens.find((t) => t.includes("/"));
  return ratio || tokens[tokens.length - 1];
}

function parsePremiumFromText(text: string) {
  const lines = text.split(/\r?\n/).map(normalizeLine).filter(Boolean);
  const premiumLines = lines.filter((line) => /premium/i.test(line));
  const numbers: number[] = [];
  for (const line of premiumLines) {
    const tokens = extractNumericTokens(line);
    for (const token of tokens) {
      const value = Number(token.replace(/[$,]/g, ""));
      if (Number.isFinite(value)) numbers.push(value);
    }
  }
  if (!numbers.length) return null;
  return Math.max(...numbers);
}

function detectDocType(text: string): ExtractedDoc["docType"] {
  const normalized = text.toLowerCase();
  if (
    /homeowners|homeowner|ho-?3|ho-?5|ho-?6|coverage a|coverage b|coverage c/.test(normalized)
  ) {
    return "homeowners";
  }
  if (/dwelling fire|dp-?3|dp-?1|dwelling policy|dp\s*policy/.test(normalized)) {
    return "dwelling_fire";
  }
  if (
    /bodily injury|property damage|vehicle|auto policy|personal auto|collision|comprehensive/.test(
      normalized
    )
  ) {
    return "auto";
  }
  return "unknown";
}

function parseCoverages(text: string, docType: ExtractedDoc["docType"]) {
  const lines = text.split(/\r?\n/).map(normalizeLine).filter(Boolean);
  const coverages: Record<string, string> = {};
  const patterns = COVERAGE_TEMPLATES[docType] || [];
  if (!patterns.length) return coverages;
  for (const line of lines) {
    for (const pattern of patterns) {
      if (pattern.regex.test(line)) {
        const value = pickCoverageValue(line);
        if (value && !coverages[pattern.label]) {
          coverages[pattern.label] = value;
        }
      }
    }
  }
  return coverages;
}

async function extractTextFromFile(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const type = (file.type || "").toLowerCase();
  if (type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf")) {
    const pdfParse = await getPdfParse();
    const parsed = await pdfParse(buffer);
    return parsed?.text || "";
  }

  if (type.startsWith("image/")) {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");
    const { data } = await worker.recognize(buffer);
    await worker.terminate();
    return data?.text || "";
  }

  return "";
}

let pdfParseCache: any = null;
async function getPdfParse() {
  if (pdfParseCache) return pdfParseCache;
  const mod: any = await import("pdf-parse/lib/pdf-parse.js");
  pdfParseCache = mod?.default || mod;
  return pdfParseCache;
}

async function extractDoc(file: File): Promise<ExtractedDoc> {
  const text = await extractTextFromFile(file);
  const premium = parsePremiumFromText(text);
  const docType = detectDocType(text);
  const coverages = parseCoverages(text, docType);
  return { text, premium, coverages, docType };
}

function diffCoverages(oldDoc: ExtractedDoc, newDoc: ExtractedDoc) {
  const diffs: string[] = [];
  const keys = new Set([
    ...Object.keys(oldDoc.coverages),
    ...Object.keys(newDoc.coverages),
  ]);

  for (const key of keys) {
    const before = oldDoc.coverages[key] || "";
    const after = newDoc.coverages[key] || "";
    if (before && !after) {
      diffs.push(`${key}: removed (was ${before}).`);
    } else if (!before && after) {
      diffs.push(`${key}: added (${after}).`);
    } else if (before && after && before !== after) {
      diffs.push(`${key}: ${before} → ${after}.`);
    }
  }
  return diffs;
}

function diffPremium(oldDoc: ExtractedDoc, newDoc: ExtractedDoc) {
  if (oldDoc.premium === null || newDoc.premium === null) return null;
  const delta = newDoc.premium - oldDoc.premium;
  const direction = delta >= 0 ? "increase" : "decrease";
  return `Premium ${direction}: $${Math.abs(delta).toFixed(2)} (from $${oldDoc.premium.toFixed(
    2
  )} to $${newDoc.premium.toFixed(2)}).`;
}

export async function POST(req: NextRequest) {
  try {
    console.log("renewal-compare: received request");
    const formData = await req.formData();
    const oldPolicy = formData.get("oldPolicy") as File | null;
    const renewalPolicy = formData.get("renewalPolicy") as File | null;
    const otherQuotes = formData.getAll("otherQuotes") as File[];

    if (!oldPolicy || !renewalPolicy) {
      return NextResponse.json(
        { error: "Both oldPolicy and renewalPolicy are required." },
        { status: 400 }
      );
    }

    const [oldDoc, renewalDoc] = await Promise.all([
      extractDoc(oldPolicy),
      extractDoc(renewalPolicy),
    ]);

    const oldVsRenewal: string[] = [];
    const premiumDiff = diffPremium(oldDoc, renewalDoc);
    if (premiumDiff) oldVsRenewal.push(premiumDiff);
    if (oldDoc.docType !== "unknown" && renewalDoc.docType !== "unknown") {
      if (oldDoc.docType !== renewalDoc.docType) {
        oldVsRenewal.push(
          `Document types differ (${oldDoc.docType} vs ${renewalDoc.docType}). Results may be incomplete.`
        );
      } else {
        oldVsRenewal.push(`Document type detected: ${oldDoc.docType}.`);
      }
    }
    oldVsRenewal.push(...diffCoverages(oldDoc, renewalDoc));

    if (!oldVsRenewal.length) {
      oldVsRenewal.push(
        "No structured coverage changes detected. Review endorsements and declarations manually."
      );
    }

    const renewalVsOtherQuotes: string[] = [];
    for (const file of otherQuotes) {
      const quoteDoc = await extractDoc(file);
      const quoteLines: string[] = [];

      if (renewalDoc.premium !== null && quoteDoc.premium !== null) {
        const delta = renewalDoc.premium - quoteDoc.premium;
        quoteLines.push(
          `Quote ${file.name}: premium ${delta >= 0 ? "higher" : "lower"} by $${Math.abs(
            delta
          ).toFixed(2)} compared to renewal.`
        );
      } else {
        quoteLines.push(`Quote ${file.name}: premium not detected for comparison.`);
      }

      const coverageDiffs = diffCoverages(quoteDoc, renewalDoc);
      if (coverageDiffs.length) {
        quoteLines.push(`Coverage differences: ${coverageDiffs.join(" ")}`);
      } else {
        quoteLines.push("Coverage differences: none detected.");
      }

      renewalVsOtherQuotes.push(quoteLines.join(" "));
    }

    const policyNumber = (formData.get("policyNumber") as string) || "";
    const itemNumber = (formData.get("itemNumber") as string) || "";
    const firstName = (formData.get("firstName") as string) || "";
    const lastName = (formData.get("lastName") as string) || "";
    const expirationDate = (formData.get("expirationDate") as string) || "";
    const lineOfBusiness = (formData.get("lineOfBusiness") as string) || "";
    const writingCarrier = (formData.get("writingCarrier") as string) || "";
    const policyPremium = safeNumber(formData.get("policyPremium"));

    const premiumLine =
      renewalDoc.premium !== null
        ? `Renewal premium extracted from documents: $${renewalDoc.premium.toFixed(2)}.`
        : policyPremium !== null
        ? `Renewal premium on record: $${policyPremium.toLocaleString()}.`
        : "Renewal premium to be confirmed.";

    const emailDraft = `Hi ${firstName} ${lastName},

I reviewed your renewal for policy ${policyNumber} (item ${itemNumber}) with ${writingCarrier}. The current term expires on ${expirationDate}. I compared the expiring term with the renewal offer and summarized the key differences.

${premiumLine}
Coverage highlights: ${oldVsRenewal.slice(0, 3).join(" ")}

If you have other quotes, I can compare them side-by-side to confirm the best fit. Would you like to review the changes together or adjust coverage options before we proceed?

Best regards,
[Your Name]`;

    return NextResponse.json(
      {
        oldVsRenewal,
        renewalVsOtherQuotes,
        emailDraft,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("renewal-compare error:", err);
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok" }, { status: 200 });
}
