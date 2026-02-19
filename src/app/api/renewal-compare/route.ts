import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RENEWAL_SERVICE_URL = process.env.RENEWAL_SERVICE_URL || "http://localhost:8001";

type ExtractedDoc = {
  text: string;
  premium: number | null;
  coverages: Record<string, string>;
  doc_type: string;
};

function safeNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function extractDoc(file: File): Promise<ExtractedDoc> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${RENEWAL_SERVICE_URL}/extract`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Extraction failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return {
    text: data.text,
    premium: data.premium,
    coverages: data.coverages,
    doc_type: data.doc_type,
  };
}

async function compareDocuments(
  oldDoc: ExtractedDoc,
  newDoc: ExtractedDoc
): Promise<{ premium_diff: string | null; coverage_diffs: string[] }> {
  const res = await fetch(`${RENEWAL_SERVICE_URL}/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      old_premium: oldDoc.premium,
      old_coverages: oldDoc.coverages,
      new_premium: newDoc.premium,
      new_coverages: newDoc.coverages,
    }),
  });

  if (!res.ok) {
    throw new Error(`Comparison failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
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

    // Extract documents via microservice
    const [oldDoc, renewalDoc] = await Promise.all([
      extractDoc(oldPolicy),
      extractDoc(renewalPolicy),
    ]);

    // Compare old vs renewal
    const comparison = await compareDocuments(oldDoc, renewalDoc);
    const oldVsRenewal: string[] = [];
    if (comparison.premium_diff) oldVsRenewal.push(comparison.premium_diff);
    if (oldDoc.doc_type !== "unknown" && renewalDoc.doc_type !== "unknown") {
      if (oldDoc.doc_type !== renewalDoc.doc_type) {
        oldVsRenewal.push(
          `Document types differ (${oldDoc.doc_type} vs ${renewalDoc.doc_type}). Results may be incomplete.`
        );
      } else {
        oldVsRenewal.push(`Document type detected: ${oldDoc.doc_type}.`);
      }
    }
    oldVsRenewal.push(...comparison.coverage_diffs);

    if (!oldVsRenewal.length) {
      oldVsRenewal.push(
        "No structured coverage changes detected. Review endorsements and declarations manually."
      );
    }

    // Compare renewal vs other quotes
    const renewalVsOtherQuotes: string[] = [];
    for (const file of otherQuotes) {
      const quoteDoc = await extractDoc(file);
      const quoteComparison = await compareDocuments(quoteDoc, renewalDoc);

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

      if (quoteComparison.coverage_diffs.length) {
        quoteLines.push(`Coverage differences: ${quoteComparison.coverage_diffs.join(" ")}`);
      } else {
        quoteLines.push("Coverage differences: none detected.");
      }

      renewalVsOtherQuotes.push(quoteLines.join(" "));
    }

    // Extract form metadata
    const policyNumber = (formData.get("policyNumber") as string) || "";
    const itemNumber = (formData.get("itemNumber") as string) || "";
    const firstName = (formData.get("firstName") as string) || "";
    const lastName = (formData.get("lastName") as string) || "";
    const expirationDate = (formData.get("expirationDate") as string) || "";
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
      { error: err?.message || "Unexpected server error." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok" }, { status: 200 });
}
