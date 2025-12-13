import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import ClientResult from "./ClientResult";

type ResultPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function QuoteResultPage({ searchParams }: ResultPageProps) {
  const params = await searchParams;
  const execIdParam = params?.exec;
  const execId = Array.isArray(execIdParam) ? execIdParam[0] : execIdParam;
  const keyParamRaw = params?.key;
  const keyParam = Array.isArray(keyParamRaw) ? keyParamRaw[0] : keyParamRaw;

  // Client-only cached result (unsaved)
  if (!execId && keyParam) {
    return (
      <main className="min-h-screen bg-gray-50 text-gray-900">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-wide text-[#0b6f6f]">Quote Result</p>
            <h1 className="text-3xl font-semibold">Quote summary</h1>
          </div>
          <ClientResult keyParam={keyParam} />
        </div>
      </main>
    );
  }

  if (!execId) {
    return (
      <main className="min-h-screen bg-gray-50 text-gray-900">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <p className="text-xs uppercase tracking-wide text-[#0b6f6f]">Quote Result</p>
          <h1 className="text-2xl font-semibold text-gray-900">Missing quote execution id.</h1>
        </div>
      </main>
    );
  }

  const execution = await prisma.quote_execution.findUnique({
    where: { quote_execution_id: execId },
    include: {
      quotes: true,
      applicant: {
        select: {
          first_name: true,
          last_name: true,
          email: true,
          xref_key: true,
        },
      },
    },
  });

  if (!execution) {
    notFound();
  }

  const primaryQuote = execution.quotes?.[0];
  const execIdText = execution.quote_execution_id ? String(execution.quote_execution_id) : "";
  const applicantIdText = execution.applicant_id != null ? String(execution.applicant_id) : "";
  const statusText = execution.status ? String(execution.status) : "";
  const bestPremiumText =
    primaryQuote?.premium != null ? `$${primaryQuote.premium.toString?.() || String(primaryQuote.premium)}` : "N/A";
  const resumeHref = (() => {
    if (execution.applicant_id) {
      return `/new?applicantId=${encodeURIComponent(execution.applicant_id)}${
        execution.applicant?.xref_key ? `&xref=${encodeURIComponent(execution.applicant.xref_key)}` : ""
      }`;
    }
    if (execution.applicant?.xref_key) return `/new?xref=${encodeURIComponent(execution.applicant.xref_key)}`;
    return "/new?fresh=1";
  })();

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-wide text-[#0b6f6f]">Quote Result</p>
          <h1 className="text-3xl font-semibold">Quote ID: {execIdText}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {execution.created_at ? new Date(execution.created_at as any).toLocaleString() : ""}
            {execution.applicant ? (
              <span className="ml-2">
                · {execution.applicant.first_name} {execution.applicant.last_name} ({execution.applicant.email})
              </span>
            ) : null}
          </p>
        </div>

        <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">Applicant</p>
            <div className="mt-1 text-sm text-gray-800">ID: {applicantIdText}</div>
            <div className="text-sm text-gray-800">Status: {statusText}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">Best Premium</p>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{bestPremiumText}</div>
            <div className="text-sm text-gray-600">{primaryQuote?.carrier_name || "—"}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">Execution ID</p>
            <div className="mt-1 text-sm font-medium text-gray-900 break-all">{execIdText}</div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Quotes</h2>
            <a
              href={resumeHref}
              className="rounded-lg bg-[#1EC8C8] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#19b3b3]"
            >
              Re-open &amp; Edit
            </a>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {execution.quotes?.map((q) => {
              const premiumText = q.premium != null ? `$${q.premium.toString?.() || String(q.premium)}` : "N/A";
              const deductibleText =
                q.deductible != null
                  ? typeof q.deductible === "string" || typeof q.deductible === "number"
                    ? String(q.deductible)
                    : JSON.stringify(q.deductible)
                  : null;
              return (
                <div key={q.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">
                  <div className="text-base font-semibold text-gray-900">{q.carrier_name || "Carrier"}</div>
                  <div className="mt-1 text-lg font-bold text-gray-900">{premiumText}</div>
                  {q.term && <div className="text-xs text-gray-600">Term: {q.term}</div>}
                  {deductibleText && <div className="text-xs text-gray-600">Deductible: {deductibleText}</div>}
                </div>
              );
            })}
            {(!execution.quotes || execution.quotes.length === 0) && (
              <div className="text-sm text-gray-600">No quote details saved.</div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
