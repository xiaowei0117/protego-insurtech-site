import { NextResponse } from "next/server";
import axios from "axios";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { XMLParser } from "fast-xml-parser";
import nodemailer from "nodemailer";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { buildEZAUTOXml, buildSubmitQuoteXml } from "./xmlBuilders";

// === 环境变量 ===
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
    url: `https://mock.ezlynx.local/quote/${v.carrier
      .toLowerCase()
      .replace(/\s+/g, "-")}`,
  }));
}

// 小工具 delay
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 美化 XML 输出（简单缩进）
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
    const primary = quotes?.[0] || null;
    const coverageLines = coverage
      ? Object.entries(coverage)
          .filter(([, v]) => Boolean(v))
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n")
      : "";

    const summaryLines =
      quotes?.map(
        (q: any, idx: number) =>
          `${idx === 0 ? "Best" : "Option"} - ${q.carrier || "N/A"}: $${q.premium || "—"}`
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
      subject: "Your auto quote — Protego InsureTech",
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
    return null; // 无 applicant 无需落库
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
          premium: q.premium
            ? new Prisma.Decimal(String(q.premium))
            : null,
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

  try {
    
    const session = await getServerSession(authOptions as any);
    const sessionUserId = (session as any)?.user?.id as string | undefined;

  const body = await req.json();
  console.log("🟦 Incoming Quote Request — xrefKey:", body.xrefKey);

  submitMode = body.submitMode;
  const forceMock = Boolean(body?.mock);
  const saveToDb = Boolean(body?.save);

  const {
    xrefKey,
    applicantId,
    applicant,
    vehicles,
    drivers,
    spouse,
    selectedPackage,
    coverage,
    contact,
  } = body;
  const applicantDbId = await resolveApplicantId(applicantId, xrefKey);
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

  let effectiveUserId = sessionUserId;
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

    /* ===========================================================
     * ① 构建 EZAuto XML（基础 XML）
     * =========================================================== */
    const ezautoXml = buildEZAUTOXml({
      applicant,
      vehicles,
      drivers,
      spouse,
      selectedPackage,
      coverage,
    });

    if (process.env.NODE_ENV === "development") {
      console.log(`\n\n🟦 [${requestId}] ========== EZLYNX EZAuto XML ==========\n`);
      console.log(prettyXml(ezautoXml));
      console.log(`\n🟦 [${requestId}] ========================================\n`);
    }

    /* ===========================================================
     * ② MOCK 模式（本地 / token 缺失 / 你现在的开发环境）
     * =========================================================== */
    const shouldMock = forceMock || USE_MOCK || !TOKEN || !BASE;

    if (shouldMock) {
      console.log(`⚠️ [${requestId}] MOCK mode enabled (no token/base)`);
      console.log(
        `ℹ️ [${requestId}] applicantDbId=${applicantDbId ?? "null"}, xrefKey=${xrefKey}`
      );

      await sleep(500);

      const mockQuotes = buildMockQuotes(vehicles, drivers);
      const best = mockQuotes[0];

      if (submitMode === "create") {
        return NextResponse.json({
          success: true,
          mode: "create",
          applicantId: "MOCK-" + Math.floor(Math.random() * 999999),
          applicantUrl: "https://mock.ezlynx.local/applicant/12345",
          raw: { mock: true, xmlSent: ezautoXml },
        });
      }

      const submitXml = buildSubmitQuoteXml({
        carrierExecutions: [{ CarrierID: 13 }],
        templateId: Number(TEMPLATE_ID),
        ezautoXml,
      });

      if (process.env.NODE_ENV === "development") {
        console.log(`\n🟧 [${requestId}] ===== MOCK SubmitQuote XML =====\n`);
        console.log(prettyXml(submitXml));
        console.log(`🟧 [${requestId}] ==================================\n`);
      }

      if (saveToDb) {
        await persistQuoteExecution({
          applicantId: applicantDbId,
          userId: effectiveUserId,
          xrefKey,
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

      return NextResponse.json({
        success: true,
        mode: "submitQuote",
        applicantId: applicantDbId ?? "MOCK-" + Math.floor(Math.random() * 999999),
        premium: best.premium,
        quoteUrl: best.url,
        quotes: mockQuotes,
        raw: { mock: true, xmlSent: submitXml },
      });
    }

    /* ===========================================================
     * ③ 真实 EZLynx API 请求
     * =========================================================== */
    let url = "";
    let xmlToSend = "";

    if (submitMode === "create") {
      url = `${BASE}/ApplicantApi/web-services/v1/applicants/auto?xrefKey=${encodeURIComponent(
        xrefKey
      )}`;
      xmlToSend = ezautoXml;
    } else {
      xmlToSend = buildSubmitQuoteXml({
        carrierExecutions: [{ CarrierID: 13 }],
        templateId: Number(TEMPLATE_ID),
        ezautoXml,
      });

      url = `${BASE}/ApplicantApi/web-services/v1/quotes/auto/submit?xrefKey=${encodeURIComponent(
        xrefKey
      )}`;
    }

    // ====== 打印最终发送给 EZLynx 的 XML ======
    if (process.env.NODE_ENV === "development") {
      console.log(
        `\n\n📤 [${requestId}] ===== Sending to EZLynx (${submitMode}) =====`
      );
      console.log("URL:", url);
      console.log("\n----- XML Sent -----\n");
      console.log(prettyXml(xmlToSend));
      console.log("\n---------------------\n");
    }

    /* 发送请求 */
    const { data: xmlResponse } = await axios.post(url, xmlToSend, {
      headers: {
        "Content-Type": "application/xml",
        Authorization: `Bearer ${TOKEN}`,
      },
    });

    // ===== 解析 XML 返回 =====
    const parser = new XMLParser({ ignoreAttributes: false });
    const json = parser.parse(xmlResponse);

    if (process.env.NODE_ENV === "development") {
      console.log(`\n📥 [${requestId}] ===== EZLynx Response XML =====\n`);
      console.log(prettyXml(xmlResponse));
      console.log(`\n📥 [${requestId}] ========================================\n`);
    }

    // 返回 JSON
    if (submitMode === "create") {
      return NextResponse.json({
        success: true,
        mode: "create",
        applicantId: json?.ApplicantResponse?.ApplicantId ?? null,
        applicantUrl: json?.ApplicantResponse?.Url ?? null,
        raw: json,
      });
    }

    // SubmitQuote
    const appId =
      json?.QuoteResponse?.ApplicantId ??
      json?.ApplicantResponse?.ApplicantId ??
      null;

    const quote =
      json?.QuoteResponse?.Quote ||
      json?.QuoteResponse?.Quotes?.[0] ||
      null;

    const premium = quote?.Premium || quote?.TotalPremium || null;
    const quoteUrl =
      json?.QuoteResponse?.Url ||
      json?.ApplicantResponse?.Url ||
      null;

    if (saveToDb && contact?.email) {
      await sendQuoteEmail({
        to: contact.email,
        applicant,
        quotes: quote ? [quote] : [],
        coverage,
      });
    }

    return NextResponse.json({
      success: true,
      mode: "submitQuote",
      applicantId: appId,
      premium,
      quoteUrl,
      raw: json,
    });
  } catch (err: any) {
    console.error(`❌ [${requestId}] EZLynx Error:`, err?.message);

    console.log(`🟡 [${requestId}] Falling back to MOCK result...\n`);

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

    const fallbackQuotes = buildMockQuotes(vehicles, drivers);

    if (saveToDb) {
      await persistQuoteExecution({
        applicantId: applicantDbId,
        userId: effectiveUserId,
        xrefKey: body?.xrefKey,
        submitMode,
        quotes: fallbackQuotes,
        raw: { mock: true, apiError: err?.message },
        status: "failed",
        error: err?.message,
      });
    }

    return NextResponse.json({
      success: true,
      mode: "submitQuote",
      applicantId: "MOCK-" + Math.floor(Math.random() * 999999),
      premium: fallbackQuotes[0].premium,
      quoteUrl: "https://mock.ezlynx.local/quote/ABC123",
      quotes: fallbackQuotes,
      raw: { mock: true, apiError: err?.message },
    });
  }
}
