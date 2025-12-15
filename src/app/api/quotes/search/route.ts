import { NextResponse } from "next/server";
import axios from "axios";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { XMLParser } from "fast-xml-parser";
import nodemailer from "nodemailer";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { buildEZAUTOXml, buildSubmitQuoteXml } from "./xmlBuilders";
import crypto from "crypto";

const BASE = process.env.EZLYNX_BASE_URL || "";
const TOKEN = process.env.EZLYNX_TOKEN || "";
const TEMPLATE_ID = process.env.EZLYNX_TEMPLATE_ID || "9436";
const USE_MOCK = process.env.USE_MOCK_API === "true";

function buildMockQuotes(vehicles: any[] = [], drivers: any[] = []) {
  const carFactor = Math.max(1, vehicles.length || 1);
  const driverFactor = Math.max(1, drivers.length || 1);
  const base = 620 + carFactor * 80 + driverFactor * 45;

  const variations = [
    { carrier: "Mock Mutual", multiplier: 1, eta: "Instant" },
    { carrier: "Acme Auto", multiplier: 1.08, eta: "1-2 min" },
    { carrier: "Zenith Assurance", multiplier: 0.96, eta: "Instant" },
  ];

  return variations.map((v, i) => ({
    carrier: v.carrier,
    premium: (base * v.multiplier + i * 12).toFixed(2),
    eta: v.eta,
    url: `https://mock.ezlynx.local/quote/${v.carrier.toLowerCase().replace(/\s+/g, "-")}`,
  }));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function prettyXml(xml: string) {
  return xml.replace(/></g, ">\n<");
}

async function resolveApplicantId(applicantId?: number | null, xrefKey?: string | null) {
  if (applicantId) return Number(applicantId);
  if (!xrefKey) return null;

  const found = await prisma.applicant.findFirst({
    where: { xref_key: xrefKey },
    select: { id: true },
  });

  return found?.id ?? null;
}

async function ensureUser(email?: string | null, name?: string | null) {
  if (!email) return null;
  const emailNorm = email.toLowerCase().trim();
  if (!emailNorm) return null;

  const user = await prisma.user.upsert({
    where: { email: emailNorm },
    update: {},
    create: {
      email: emailNorm,
      name: name || emailNorm,
    },
  });

  return user;
}

const toISODate = (date?: string | null) => {
  if (!date) return null;
  try {
    return new Date(date).toISOString();
  } catch {
    return null;
  }
};

function mapCoverageToConfig(coverage: any, selectedPackage?: string | null) {
  if (!coverage) return null;
  return {
    bi_pd_liability: coverage["Bodily Injury Liability"] || null,
    uninsured_motorist: coverage["Uninsured/Underinsured Motorist Bodily Injury"] || null,
    pip: coverage["Personal Injury Protection"] || null,
    collision: coverage["Collision Deductible"] || null,
    comprehensive: coverage["Comprehensive Deductible"] || null,
    rental: coverage["Rental"] || null,
    roadside_assistance: coverage["Roadside"] || null,
    extra: {
      property_damage: coverage["Property Damage"] || null,
      uninsured_property_damage: coverage["Uninsured/Underinsured Property Damage"] || null,
      medical_payment: coverage["Medical Payment"] || null,
      selectedPackage: selectedPackage || null,
      rawCoverage: coverage,
    },
  };
}

function normalizeDrivers(drivers: any[] = []) {
  return drivers.map((d) => ({
    first_name: d.firstName ?? d.first_name ?? null,
    last_name: d.lastName ?? d.last_name ?? null,
    birth_date: d.birthDate ?? d.birth_date ?? null,
    relationship: d.relationship ?? null,
    marital_status: d.maritalStatus ?? d.marital_status ?? null,
    occupation: d.occupation ?? null,
    education: d.education ?? null,
    dl_number: d.dlNumber ?? d.dl_number ?? null,
    dl_state: d.dlState ?? d.dl_state ?? null,
    extra: d.extra ?? {},
  }));
}

function buildSpouseDrivers({
  spouse,
  applicant,
  drivers,
}: {
  spouse: any;
  applicant: any;
  drivers: any[];
}) {
  const normalized = normalizeDrivers(drivers);
  const primaryDriver = normalized[0] || {};

  const spouseDriver = {
    first_name: spouse?.firstName ?? spouse?.first_name ?? applicant?.firstName ?? applicant?.first_name ?? "Spouse",
    last_name: spouse?.lastName ?? spouse?.last_name ?? applicant?.lastName ?? applicant?.last_name ?? null,
    birth_date: spouse?.birthDate ?? spouse?.birth_date ?? null,
    relationship: "Self",
    marital_status: spouse?.maritalStatus ?? applicant?.maritalStatus ?? applicant?.marital_status ?? "Married",
    occupation: spouse?.occupation ?? null,
    education: spouse?.education ?? null,
    dl_number: spouse?.dlNumber ?? spouse?.dl_number ?? null,
    dl_state: spouse?.dlState ?? spouse?.dl_state ?? null,
    extra: {},
  };

  const applicantDriver = {
    ...primaryDriver,
    first_name: applicant?.firstName ?? applicant?.first_name ?? primaryDriver.first_name ?? null,
    last_name: applicant?.lastName ?? applicant?.last_name ?? primaryDriver.last_name ?? null,
    birth_date: applicant?.birthDate ?? applicant?.birth_date ?? primaryDriver.birth_date ?? null,
    relationship: "Spouse",
  };

  return [spouseDriver, applicantDriver, ...normalized.slice(1)];
}

async function upsertApplicantWithRelations(opts: {
  xrefKey: string;
  applicant: any;
  contact?: any;
  vehicles?: any[];
  drivers?: any[];
  coverage?: any;
  selectedPackage?: string | null;
  userId?: string | null;
  extra?: Record<string, any>;
  currentInsurance?: {
    has_insurance?: string | null;
    provider?: string | null;
    duration?: string | null;
    bodily_injury_limit?: string | null;
    lapse_duration?: string | null;
    claims?: any;
    extra?: any;
  } | null;
}) {
  const {
    xrefKey,
    applicant,
    contact,
    vehicles = [],
    drivers = [],
    coverage,
    selectedPackage,
    userId,
    extra = {},
    currentInsurance = null,
  } = opts;

  const applicantData = {
    first_name: applicant?.firstName ?? applicant?.first_name ?? null,
    last_name: applicant?.lastName ?? applicant?.last_name ?? null,
    birth_date: toISODate(applicant?.birthDate ?? applicant?.birth_date),
    gender: applicant?.gender ?? applicant?.sex ?? null,
    marital_status: applicant?.maritalStatus ?? applicant?.marital_status ?? null,
    address: applicant?.address ?? null,
    unit: applicant?.unit ?? null,
    city: applicant?.city ?? null,
    state: applicant?.state ?? null,
    zip_code: applicant?.zipCode ?? applicant?.zip_code ?? null,
    residence: applicant?.residence ?? null,
    phone: contact?.phone ?? applicant?.phone ?? null,
    email: contact?.email ?? applicant?.email ?? null,
    status: "draft",
    xref_key: xrefKey,
    user_id: userId || null,
    extra,
  };

  const applicantRecord = await prisma.applicant.upsert({
    where: { xref_key: xrefKey },
    update: applicantData,
    create: applicantData,
  });

  await prisma.vehicle.deleteMany({ where: { applicant_id: applicantRecord.id } });
  if (vehicles.length) {
    await prisma.vehicle.createMany({
      data: vehicles.map((v: any) => ({
        applicant_id: applicantRecord.id,
        vin: v.vin ?? v.VIN ?? null,
        year: v.year ?? null,
        make: v.make ?? null,
        model: v.model ?? null,
        sub_model: v.subModel ?? v.sub_model ?? null,
        ownership: v.ownership != null ? String(v.ownership) : null,
        usage: v.usage != null ? String(v.usage) : null,
        mileage: v.mileage != null ? String(v.mileage) : null,
        extra: v.extra ?? {},
      })),
    });
  }

  await prisma.driver.deleteMany({ where: { applicant_id: applicantRecord.id } });
  const normalizedDrivers = drivers.map((d: any) => ({
    applicant_id: applicantRecord.id,
    first_name: d.first_name ?? d.firstName ?? null,
    last_name: d.last_name ?? d.lastName ?? null,
    birth_date: toISODate(d.birth_date ?? d.birthDate),
    relationship: d.relationship ?? null,
    marital_status: d.marital_status ?? d.maritalStatus ?? null,
    occupation: d.occupation ?? null,
    education: d.education ?? null,
    dl_number: d.dl_number ?? d.dlNumber ?? null,
    dl_state: d.dl_state ?? d.dlState ?? null,
    extra: d.extra ?? {},
  }));

  if (normalizedDrivers.length) {
    await prisma.driver.createMany({ data: normalizedDrivers });
  }

  const coverageConfig = mapCoverageToConfig(coverage, selectedPackage);
  if (coverageConfig) {
    const existingCov = await prisma.coverage_config.findFirst({
      where: { applicant_id: applicantRecord.id },
    });

    if (existingCov) {
      await prisma.coverage_config.update({
        where: { id: existingCov.id },
        data: { ...coverageConfig },
      });
    } else {
      await prisma.coverage_config.create({
        data: {
          applicant_id: applicantRecord.id,
          ...coverageConfig,
        },
      });
    }
  }

  if (currentInsurance) {
    const existingIns = await prisma.current_insurance.findFirst({
      where: { applicant_id: applicantRecord.id },
    });

    const insuranceData = {
      has_insurance: currentInsurance.has_insurance ?? currentInsurance.hasInsurance ?? null,
      provider: currentInsurance.provider ?? null,
      duration: currentInsurance.duration ?? null,
      bodily_injury_limit: currentInsurance.bodily_injury_limit ?? null,
      lapse_duration: currentInsurance.lapse_duration ?? null,
      claims: (currentInsurance as any).claims ?? [],
      extra: (currentInsurance as any).extra ?? {},
    };

    if (existingIns) {
      await prisma.current_insurance.update({
        where: { id: existingIns.id },
        data: insuranceData,
      });
    } else {
      await prisma.current_insurance.create({
        data: {
          applicant_id: applicantRecord.id,
          ...insuranceData,
        },
      });
    }
  }

  return applicantRecord;
}

async function sendQuoteEmail({
  to,
  applicant,
  quotes,
  coverage,
}: {
  to?: string | null;
  applicant?: any;
  quotes?: any[];
  coverage?: any;
}) {
  if (!to) return;
  const server = process.env.EMAIL_SERVER;
  const from = process.env.EMAIL_FROM;
  if (!server || !from) {
    console.warn("Email not sent: EMAIL_SERVER or EMAIL_FROM not configured");
    return;
  }

  try {
    const transporter = nodemailer.createTransport(server);
    const coverageLines = coverage
      ? Object.entries(coverage)
          .filter(([, v]) => Boolean(v))
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n")
      : "";

    const summaryLines =
      quotes?.map(
        (q: any, idx: number) => `${idx === 0 ? "Best" : "Option"} - ${q.carrier || "N/A"}: $${q.premium || "N/A"}`
      ) || [];

    const text = `
Hi ${applicant?.firstName || "there"},

Thanks for requesting an auto quote with Protego InsureTech. Your agent will reach out to finalize the quote and next steps.

Quote summary:
${summaryLines.length ? summaryLines.join("\n") : "No quote details returned."}

Coverage snapshot:
${coverageLines || "Not provided"}

If you have questions, just reply to this email.

— Protego InsureTech
    `.trim();

    await transporter.sendMail({
      to,
      from,
      subject: "Your auto quote • Protego InsureTech",
      text,
    });
  } catch (err: any) {
    console.warn("sendQuoteEmail failed:", err?.message);
  }
}

async function persistQuoteExecution(opts: {
  applicantId: number | null;
  userId?: string | null;
  xrefKey?: string | null;
  submitMode: string;
  quotes: any[];
  raw: any;
  status: "success" | "failed";
  error?: string;
}) {
  const { applicantId, userId, xrefKey, submitMode, quotes, raw, status, error } = opts;
  if (!applicantId) {
    console.warn("persistQuoteExecution skipped: missing applicantId");
    return null;
  }

  const baseKey = (xrefKey || Math.random().toString(36).slice(2)).slice(0, 24);
  const execId = `exec-${baseKey}-${Date.now().toString().slice(-8)}`;

  try {
    const exec = await prisma.quote_execution.create({
      data: {
        applicant_id: applicantId,
        user_id: userId || null,
        quote_execution_id: execId,
        carrier_name: "EZLynx",
        status,
        error_message: error || null,
        raw_response: raw,
        extra: { submitMode, xrefKey },
      },
    });

    if (quotes?.length) {
      await prisma.quote.createMany({
        data: quotes.map((q) => ({
          applicant_id: applicantId,
          user_id: userId || null,
          quote_execution_id: execId,
          carrier_name: q.carrier || q.Carrier || "N/A",
          premium: q.premium ? new Prisma.Decimal(String(q.premium)) : null,
          term: q.term || null,
          deductible: q.deductible || null,
          discounts: q.discounts || null,
          fees: q.fees || null,
          extra: q,
        })),
      });
    }

    await prisma.audit_log.create({
      data: {
        applicant_id: applicantId,
        event: `quote_${status}`,
        message: `Quote execution ${status}`,
        extra: { submitMode, xrefKey, execId, quoteCount: quotes?.length || 0 },
      },
    });

    return exec;
  } catch (e: any) {
    console.warn("persistQuoteExecution failed:", e?.message);
    return null;
  }
}

export async function POST(req: Request) {
  const requestId = Math.random().toString(36).substring(2, 10);
  let submitMode = "submitQuote";
  let spouseDrivers: any[] = [];
  let spouseApplicantRecord: any = null;
  let coverageForEmail: any = null;
  let contactForEmail: any = null;
  let applicantForEmail: any = null;
  let shouldRunSpouse = false;
  let applicantDbId: number | null = null;
  let spouseApplicantDbId: number | null = null;
  let spouseApplicantForXml: any = null;
  let spouseXrefKey: string | null = null;
  let requestBody: any = null;
  let effectiveUserId: string | null | undefined = null;
  let primaryCurrentInsurance: any = null;
  let spouseCurrentInsurance: any = null;

  try {
    const session = await getServerSession(authOptions as any);
    const sessionUserId = (session as any)?.user?.id as string | undefined;

    requestBody = await req.json();
    console.log(`[${requestId}] Incoming Quote Request xrefKey:`, requestBody?.xrefKey);

    submitMode = requestBody.submitMode;
    const forceMock = Boolean(requestBody?.mock);
    const saveToDb = Boolean(requestBody?.save);

    const rawXrefKey = requestBody.xrefKey || crypto.randomUUID();
    const baseXrefKey = rawXrefKey.endsWith("-spouse") ? rawXrefKey.replace(/-spouse$/, "") : rawXrefKey;
    const isSpouseContext = rawXrefKey.endsWith("-spouse");

    const {
      xrefKey,
      applicantId,
      applicant,
      vehicles = [],
      drivers = [],
      spouse: spouseInput,
      selectedPackage,
      coverage,
      contact,
      dualApplicantQuotes,
    } = requestBody;

    applicantForEmail = applicant;
    contactForEmail = contact;
    coverageForEmail = coverage;

    const effectiveXrefKey = baseXrefKey;
    const spouseXrefNormalized = `${baseXrefKey}-spouse`;

    // Resolve primary/spouse applicants based on context to avoid recreating records
    if (isSpouseContext) {
      spouseApplicantDbId = await resolveApplicantId(applicantId, rawXrefKey);
      applicantDbId = await resolveApplicantId(null, baseXrefKey);
    } else {
      applicantDbId = await resolveApplicantId(applicantId, baseXrefKey);
      spouseApplicantDbId = await resolveApplicantId(null, spouseXrefNormalized);
    }

    primaryCurrentInsurance = applicantDbId
      ? await prisma.current_insurance.findFirst({ where: { applicant_id: applicantDbId } })
      : null;
    spouseCurrentInsurance = spouseApplicantDbId
      ? await prisma.current_insurance.findFirst({ where: { applicant_id: spouseApplicantDbId } })
      : null;

    if (saveToDb && applicantDbId && sessionUserId) {
      try {
        await prisma.applicant.update({
          where: { id: applicantDbId },
          data: { user_id: sessionUserId },
        });
      } catch (e) {
        console.warn("attach user_id to applicant failed:", (e as any)?.message);
      }
    }

    effectiveUserId = sessionUserId;
    if (saveToDb && !effectiveUserId) {
      const contactEmail = contact?.email || applicant?.email || null;
      const contactName = `${applicant?.firstName ?? ""} ${applicant?.lastName ?? ""}`.trim();
      const user = await ensureUser(contactEmail, contactName || contactEmail);
      effectiveUserId = user?.id;

      if (user?.id && applicantDbId) {
        try {
          await prisma.applicant.update({
            where: { id: applicantDbId },
            data: { user_id: user.id },
          });
        } catch (e) {
          console.warn("attach ensured user to applicant failed:", (e as any)?.message);
        }
      }
    }

    shouldRunSpouse = Boolean(dualApplicantQuotes && (spouseInput || isSpouseContext));
    spouseXrefKey = shouldRunSpouse ? spouseXrefNormalized : null;

    // Determine which applicant is primary for this request
    const primaryApplicantInput = isSpouseContext ? spouseInput || applicant : applicant;
    const spouseApplicantInput = isSpouseContext ? applicant : spouseInput;

    // Reorder drivers so that primary is Self, spouse is Spouse
    const normalizeDriverList = (list: any[]) =>
      list.map((d) => ({
        first_name: d.firstName ?? d.first_name ?? null,
        last_name: d.lastName ?? d.last_name ?? null,
        birth_date: d.birthDate ?? d.birth_date ?? null,
        relationship: d.relationship ?? null,
        marital_status: d.maritalStatus ?? d.marital_status ?? null,
        occupation: d.occupation ?? null,
        education: d.education ?? null,
        dl_number: d.dlNumber ?? d.dl_number ?? null,
        dl_state: d.dlState ?? d.dl_state ?? null,
        extra: d.extra ?? {},
      }));

    const rawDriversNorm = normalizeDriverList(drivers);
    const buildOrderedDrivers = (primary: any, spouse: any | null, list: any[]) => {
      const primaryFromList = list.find((d) => (d.relationship || "").toLowerCase() === "self") || list[0];
      const spouseFromList = list.find((d) => (d.relationship || "").toLowerCase() === "spouse");

      const primaryDriver = {
        ...(primaryFromList || {}),
        first_name: primary?.firstName ?? primary?.first_name ?? primaryFromList?.first_name ?? null,
        last_name: primary?.lastName ?? primary?.last_name ?? primaryFromList?.last_name ?? null,
        birth_date: primary?.birthDate ?? primary?.birth_date ?? primaryFromList?.birth_date ?? null,
        relationship: "Self",
      };

      const spouseDriver = spouse
        ? {
            ...(spouseFromList || {}),
            first_name: spouse?.firstName ?? spouse?.first_name ?? spouseFromList?.first_name ?? null,
            last_name: spouse?.lastName ?? spouse?.last_name ?? spouseFromList?.last_name ?? null,
            birth_date: spouse?.birthDate ?? spouse?.birth_date ?? spouseFromList?.birth_date ?? null,
            relationship: "Spouse",
            occupation: spouse?.occupation ?? spouse?.spouseOccupation ?? spouseFromList?.occupation ?? null,
            education: spouse?.education ?? spouse?.spouseEducation ?? spouseFromList?.education ?? null,
          }
        : null;

      const rest = list.filter((d) => d !== primaryFromList && d !== spouseFromList);
      return spouseDriver ? [primaryDriver, spouseDriver, ...rest] : [primaryDriver, ...rest];
    };

    const orderedDriversForPrimary = buildOrderedDrivers(primaryApplicantInput, spouseApplicantInput, rawDriversNorm);
    const orderedDriversForSpouse = shouldRunSpouse
      ? buildOrderedDrivers(spouseApplicantInput, primaryApplicantInput, rawDriversNorm)
      : rawDriversNorm;

    if (shouldRunSpouse) {
      spouseDrivers = orderedDriversForSpouse.map((d) => ({
        first_name: d.first_name,
        last_name: d.last_name,
        birth_date: d.birth_date,
        relationship: d.relationship,
        marital_status: d.marital_status,
        occupation: d.occupation,
        education: d.education,
        dl_number: d.dl_number,
        dl_state: d.dl_state,
        extra: d.extra,
      }));

      spouseApplicantForXml = {
        firstName:
          spouseApplicantInput?.firstName ??
          spouseApplicantInput?.first_name ??
          primaryApplicantInput?.firstName ??
          primaryApplicantInput?.first_name,
        lastName:
          spouseApplicantInput?.lastName ??
          spouseApplicantInput?.last_name ??
          primaryApplicantInput?.lastName ??
          primaryApplicantInput?.last_name,
        birthDate: spouseApplicantInput?.birthDate ?? spouseApplicantInput?.birth_date ?? null,
        gender: primaryApplicantInput?.gender ?? primaryApplicantInput?.sex ?? null,
        maritalStatus: primaryApplicantInput?.maritalStatus ?? primaryApplicantInput?.marital_status ?? "Married",
        address: primaryApplicantInput?.address ?? primaryApplicantInput?.street,
        unit: primaryApplicantInput?.unit ?? null,
        city: primaryApplicantInput?.city ?? null,
        state: primaryApplicantInput?.state ?? null,
        zipCode: primaryApplicantInput?.zipCode ?? primaryApplicantInput?.zip_code ?? null,
      };

      const spouseApplicantForDb = {
        ...(primaryApplicantInput || {}),
        ...(spouseApplicantInput || {}),
        address: primaryApplicantInput?.address ?? primaryApplicantInput?.street,
        unit: primaryApplicantInput?.unit ?? null,
        city: primaryApplicantInput?.city ?? null,
        state: primaryApplicantInput?.state ?? null,
        zipCode: primaryApplicantInput?.zipCode ?? primaryApplicantInput?.zip_code ?? null,
        phone: contact?.phone ?? primaryApplicantInput?.phone ?? null,
        email:
          spouseApplicantInput?.email ??
          contact?.email ??
          primaryApplicantInput?.email ??
          primaryApplicantInput?.contact?.email ??
          null,
        maritalStatus: primaryApplicantInput?.maritalStatus ?? primaryApplicantInput?.marital_status ?? "Married",
      };

      const spouseXref = spouseXrefKey || spouseXrefNormalized;
      spouseApplicantRecord = await upsertApplicantWithRelations({
        xrefKey: spouseXref,
        applicant: spouseApplicantForDb,
        contact,
        vehicles,
        drivers: spouseDrivers,
        coverage,
        selectedPackage,
        userId: effectiveUserId,
        currentInsurance: primaryCurrentInsurance || spouseCurrentInsurance,
        extra: { sourceApplicantId: applicantDbId, dualApplicant: true },
      });

      spouseApplicantDbId = spouseApplicantRecord?.id ?? null;
      spouseXrefKey = spouseXref;
    }

    const primaryEzautoXml = buildEZAUTOXml({
      applicant: primaryApplicantInput,
      vehicles,
      drivers: orderedDriversForPrimary,
      spouse: spouseApplicantInput,
      selectedPackage,
      coverage,
    });

    const spouseEzautoXml =
      shouldRunSpouse && spouseApplicantForXml
        ? buildEZAUTOXml({
            applicant: spouseApplicantForXml,
            vehicles,
            drivers: spouseDrivers,
            spouse: primaryApplicantInput,
            selectedPackage,
            coverage,
          })
        : null;

    if (process.env.NODE_ENV === "development") {
      console.log(`\n\n[${requestId}] ========== EZLYNX EZAuto XML (Primary) ==========\n`);
      console.log(prettyXml(primaryEzautoXml));
      console.log(`\n[${requestId}] ================================================\n`);
      if (spouseEzautoXml) {
        console.log(`\n\n[${requestId}] ========== EZLYNX EZAuto XML (Spouse) ==========\n`);
        console.log(prettyXml(spouseEzautoXml));
        console.log(`\n[${requestId}] ================================================\n`);
      }
    }

    const shouldMock = forceMock || USE_MOCK || !TOKEN || !BASE;

    if (shouldMock) {
      console.log(`[${requestId}] MOCK mode enabled (no token/base)`);
      console.log(`[${requestId}] applicantDbId=${applicantDbId ?? "null"}, xrefKey=${effectiveXrefKey}`);

      await sleep(500);

      const mockQuotes = buildMockQuotes(vehicles, drivers);
      const best = mockQuotes[0];

      if (submitMode === "create") {
        return NextResponse.json({
          success: true,
          mode: "create",
          applicantId: "MOCK-" + Math.floor(Math.random() * 999999),
          applicantUrl: "https://mock.ezlynx.local/applicant/12345",
          raw: { mock: true, xmlSent: primaryEzautoXml },
        });
      }

      const submitXml = buildSubmitQuoteXml({
        carrierExecutions: [{ CarrierID: 13 }],
        templateId: Number(TEMPLATE_ID),
        ezautoXml: primaryEzautoXml,
      });

      let persistedExec = null;

      if (saveToDb) {
        persistedExec = await persistQuoteExecution({
          applicantId: applicantDbId,
          userId: effectiveUserId,
          xrefKey: effectiveXrefKey,
          submitMode,
          quotes: mockQuotes,
          raw: { mock: true, xmlSent: submitXml },
          status: "success",
        });

        if (contact?.email) {
          await sendQuoteEmail({
            to: contact.email,
            applicant,
            quotes: mockQuotes,
            coverage,
          });
        }
      }

      let spouseResult: any = null;
      if (shouldRunSpouse) {
        const spouseMockQuotes = buildMockQuotes(vehicles, spouseDrivers);
        const spouseBest = spouseMockQuotes[0];

        let spouseExec = null;
        if (saveToDb) {
          spouseExec = await persistQuoteExecution({
            applicantId: spouseApplicantDbId,
            userId: effectiveUserId,
            xrefKey: spouseXrefKey || undefined,
            submitMode,
            quotes: spouseMockQuotes,
            raw: { mock: true, xmlSent: spouseEzautoXml },
            status: "success",
          });
        }

        spouseResult = {
          applicantId: spouseApplicantDbId ?? "MOCK-" + Math.floor(Math.random() * 999999),
          premium: spouseBest?.premium ?? null,
          quoteUrl: spouseBest?.url ?? null,
          execId: spouseExec?.quote_execution_id || null,
          quotes: spouseMockQuotes,
          raw: { mock: true, xmlSent: spouseEzautoXml },
        };
      }

      const primaryResult = {
        applicantId: applicantDbId ?? "MOCK-" + Math.floor(Math.random() * 999999),
        premium: best?.premium ?? null,
        quoteUrl: best?.url ?? null,
        execId: persistedExec?.quote_execution_id || null,
        quotes: mockQuotes,
        raw: { mock: true, xmlSent: submitXml },
      };

      return NextResponse.json({
        success: true,
        mode: submitMode,
        applicantId: primaryResult.applicantId,
        premium: primaryResult.premium,
        quoteUrl: primaryResult.quoteUrl,
        execId: primaryResult.execId,
        quotes: primaryResult.quotes,
        primary: primaryResult,
        spouse: spouseResult,
        raw: { mock: true },
      });
    }

    const runEzlynxQuote = async ({
      applicantData,
      driversData,
      xmlToSend,
      xrefKeyToUse,
      applicantDb,
      label,
    }: {
      applicantData: any;
      driversData: any[];
      xmlToSend: string;
      xrefKeyToUse: string;
      applicantDb: number | null;
      label: "primary" | "spouse";
    }) => {
      let url = "";
      let xmlPayload = "";

      if (submitMode === "create") {
        url = `${BASE}/ApplicantApi/web-services/v1/applicants/auto?xrefKey=${encodeURIComponent(xrefKeyToUse)}`;
        xmlPayload = xmlToSend;
      } else {
        xmlPayload = buildSubmitQuoteXml({
          carrierExecutions: [{ CarrierID: 13 }],
          templateId: Number(TEMPLATE_ID),
          ezautoXml: xmlToSend,
        });

        url = `${BASE}/ApplicantApi/web-services/v1/quotes/auto/submit?xrefKey=${encodeURIComponent(
          xrefKeyToUse
        )}`;
      }

      if (process.env.NODE_ENV === "development") {
        console.log(`\n\n[${requestId}] ===== Sending to EZLynx (${label}) (${submitMode}) =====`);
        console.log("URL:", url);
        console.log("\n----- XML Sent -----\n");
        console.log(prettyXml(xmlPayload));
        console.log("\n---------------------\n");
      }

      const { data: xmlResponse } = await axios.post(url, xmlPayload, {
        headers: {
          "Content-Type": "application/xml",
          Authorization: `Bearer ${TOKEN}`,
        },
      });

      const parser = new XMLParser({ ignoreAttributes: false });
      const json = parser.parse(xmlResponse);

      if (process.env.NODE_ENV === "development") {
        console.log(`\n[${requestId}] ===== EZLynx Response XML (${label}) =====\n`);
        console.log(prettyXml(xmlResponse));
        console.log(`\n[${requestId}] ========================================\n`);
      }

      if (submitMode === "create") {
        return {
          applicantId: json?.ApplicantResponse?.ApplicantId ?? null,
          premium: null,
          quoteUrl: json?.ApplicantResponse?.Url ?? null,
          execId: null,
          quotes: [],
          raw: json,
        };
      }

      const appId = json?.QuoteResponse?.ApplicantId ?? json?.ApplicantResponse?.ApplicantId ?? null;
      const quote = json?.QuoteResponse?.Quote || json?.QuoteResponse?.Quotes?.[0] || null;
      const premium = quote?.Premium || quote?.TotalPremium || null;
      const quoteUrl = json?.QuoteResponse?.Url || json?.ApplicantResponse?.Url || null;

      let persistedExec = null;

      if (saveToDb) {
        persistedExec = await persistQuoteExecution({
          applicantId: applicantDb,
          userId: effectiveUserId,
          xrefKey: xrefKeyToUse,
          submitMode,
          quotes: quote ? [quote] : [],
          raw: json,
          status: "success",
        });

        if (contact?.email && label === "primary") {
          await sendQuoteEmail({
            to: contact.email,
            applicant: applicantData,
            quotes: quote ? [quote] : [],
            coverage,
          });
        }
      }

      return {
        applicantId: appId,
        premium,
        quoteUrl,
        execId: persistedExec?.quote_execution_id || null,
        quotes: quote ? [quote] : [],
        raw: json,
      };
    };

    const primaryResult = await runEzlynxQuote({
      applicantData: applicant,
      driversData: drivers,
      xmlToSend: primaryEzautoXml,
      xrefKeyToUse: effectiveXrefKey,
      applicantDb: applicantDbId,
      label: "primary",
    });

    let spouseResult: any = null;
    if (shouldRunSpouse && spouseEzautoXml) {
      spouseResult = await runEzlynxQuote({
        applicantData: spouseApplicantForXml,
        driversData: spouseDrivers,
        xmlToSend: spouseEzautoXml,
        xrefKeyToUse: spouseXrefKey || `${effectiveXrefKey}-spouse`,
        applicantDb: spouseApplicantDbId,
        label: "spouse",
      });
    }

    return NextResponse.json({
      success: true,
      mode: submitMode,
      applicantId: primaryResult.applicantId,
      premium: primaryResult.premium,
      quoteUrl: primaryResult.quoteUrl,
      execId: primaryResult.execId,
      quotes: primaryResult.quotes,
      primary: primaryResult,
      spouse: spouseResult,
    });
  } catch (err: any) {
    console.error(`[${requestId}] EZLynx Error:`, err?.message);

    await sleep(300);

    if (submitMode === "create") {
      return NextResponse.json({
        success: true,
        mode: "create",
        applicantId: "MOCK-" + Math.floor(Math.random() * 999999),
        applicantUrl: "https://mock.ezlynx.local/applicant/12345",
        raw: { mock: true, error: err?.message },
      });
    }

    const fallbackQuotes = buildMockQuotes(requestBody?.vehicles || [], requestBody?.drivers || []);

    let persistedExec = null;
    if (requestBody?.save && applicantDbId) {
      persistedExec = await persistQuoteExecution({
        applicantId: applicantDbId,
        userId: effectiveUserId,
        xrefKey: requestBody?.xrefKey,
        submitMode,
        quotes: fallbackQuotes,
        raw: { mock: true, apiError: err?.message },
        status: "failed",
        error: err?.message,
      });
    }

    let spouseResult: any = null;
    if (shouldRunSpouse) {
      const spouseFallbackQuotes = buildMockQuotes(requestBody?.vehicles || [], spouseDrivers);
      let spouseExec = null;
      if (requestBody?.save && spouseApplicantDbId) {
        spouseExec = await persistQuoteExecution({
          applicantId: spouseApplicantDbId,
          userId: effectiveUserId,
          xrefKey: spouseXrefKey || undefined,
          submitMode,
          quotes: spouseFallbackQuotes,
          raw: { mock: true, apiError: err?.message },
          status: "failed",
          error: err?.message,
        });
      }

      spouseResult = {
        applicantId: spouseApplicantDbId ?? "MOCK-" + Math.floor(Math.random() * 999999),
        premium: spouseFallbackQuotes[0]?.premium ?? null,
        quoteUrl: "https://mock.ezlynx.local/quote/ABC123",
        execId: spouseExec?.quote_execution_id || null,
        quotes: spouseFallbackQuotes,
        raw: { mock: true, apiError: err?.message },
      };
    }

    const primaryResult = {
      applicantId: applicantDbId ?? "MOCK-" + Math.floor(Math.random() * 999999),
      premium: fallbackQuotes[0]?.premium ?? null,
      quoteUrl: "https://mock.ezlynx.local/quote/ABC123",
      execId: persistedExec?.quote_execution_id || null,
      quotes: fallbackQuotes,
      raw: { mock: true, apiError: err?.message },
    };

    return NextResponse.json({
      success: true,
      mode: submitMode,
      applicantId: primaryResult.applicantId,
      premium: primaryResult.premium,
      quoteUrl: primaryResult.quoteUrl,
      execId: primaryResult.execId,
      quotes: primaryResult.quotes,
      primary: primaryResult,
      spouse: spouseResult,
      raw: { mock: true, apiError: err?.message },
    });
  }
}
