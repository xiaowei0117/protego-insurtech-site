import { NextRequest, NextResponse } from "next/server";

function formatSize(bytes: number) {
  if (!Number.isFinite(bytes)) return "0 KB";
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function safeNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(req: NextRequest) {
  try {
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

    const oldSize = oldPolicy.size || 0;
    const renewalSize = renewalPolicy.size || 0;
    const sizeDiff = renewalSize - oldSize;
    const sizeDiffPct =
      oldSize > 0 ? Math.round((Math.abs(sizeDiff) / oldSize) * 100) : null;

    const oldVsRenewal = [
      `Prior term file: ${oldPolicy.name} (${formatSize(oldSize)}, ${oldPolicy.type || "unknown"}).`,
      `Renewal file: ${renewalPolicy.name} (${formatSize(renewalSize)}, ${renewalPolicy.type || "unknown"}).`,
    ];

    if (sizeDiffPct !== null) {
      oldVsRenewal.push(
        `Document size changed by ${sizeDiffPct}% (${sizeDiff >= 0 ? "+" : "-"}${formatSize(
          Math.abs(sizeDiff)
        )}). Review coverage limits, endorsements, and deductibles for changes.`
      );
    } else {
      oldVsRenewal.push(
        "Unable to compute document size difference. Review coverage limits, endorsements, and deductibles for changes."
      );
    }

    const renewalVsOtherQuotes = otherQuotes.map((file) => {
      const quoteSize = file.size || 0;
      const diff = renewalSize - quoteSize;
      const diffPct =
        quoteSize > 0 ? Math.round((Math.abs(diff) / quoteSize) * 100) : null;
      const sizeNote =
        diffPct === null
          ? "Size comparison not available."
          : `Renewal document is ${diff >= 0 ? diffPct : -diffPct}% ${
              diff >= 0 ? "larger" : "smaller"
            } than this quote.`;
      return `Quote file: ${file.name} (${formatSize(quoteSize)}). ${sizeNote}`;
    });

    const policyNumber = (formData.get("policyNumber") as string) || "";
    const itemNumber = (formData.get("itemNumber") as string) || "";
    const firstName = (formData.get("firstName") as string) || "";
    const lastName = (formData.get("lastName") as string) || "";
    const expirationDate = (formData.get("expirationDate") as string) || "";
    const lineOfBusiness = (formData.get("lineOfBusiness") as string) || "";
    const writingCarrier = (formData.get("writingCarrier") as string) || "";
    const policyPremium = safeNumber(formData.get("policyPremium"));

    const emailDraft = `Hi ${firstName} ${lastName},

I reviewed your renewal for policy ${policyNumber} (item ${itemNumber}) with ${writingCarrier}. The current term expires on ${expirationDate}. I compared the expiring term with the renewal offer and noted the key differences in coverage and pricing.

Your renewal premium is currently listed at ${
      policyPremium !== null ? `$${policyPremium.toLocaleString()}` : "the proposed amount"
    } for ${lineOfBusiness}. I can also review any competing quotes you share to confirm whether the renewal is the best fit.

Would you like me to walk through the changes with you or update any coverage options before we proceed?

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
