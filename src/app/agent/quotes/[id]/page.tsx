import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

function formatDate(value?: Date | string | null) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString();
}

type Props = {
  params: { id: string };
};

export default async function AgentApplicantDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions as any);
  const role = (session as any)?.user?.role;
  if (role !== "agent") {
    redirect("/agent/login");
  }

  const applicantId = Number(params.id);
  if (!Number.isFinite(applicantId)) {
    notFound();
  }

  const applicant = await prisma.applicant.findUnique({
    where: { id: applicantId },
    include: {
      drivers: true,
      vehicles: true,
      current_insurance: true,
      coverage_configs: true,
      quote_executions: {
        orderBy: { created_at: "desc" },
        take: 1,
        include: {
          quotes: true,
        },
      },
    },
  });

  if (!applicant) {
    notFound();
  }

  const latestExec = applicant.quote_executions?.[0] || null;

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-[#0b6f6f]">Agent Portal</p>
            <h1 className="text-3xl font-semibold">Applicant #{applicant.id}</h1>
            <p className="text-sm text-gray-600">
              {applicant.first_name} {applicant.last_name} · {applicant.email}
            </p>
          </div>
          <a
            href="/agent/quotes"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            Back to list
          </a>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Applicant Info</h2>
            <div className="mt-3 space-y-1 text-sm text-gray-800">
              <div>Name: {applicant.first_name} {applicant.last_name}</div>
              <div>Email: {applicant.email}</div>
              <div>Phone: {applicant.phone}</div>
              <div>Birth date: {formatDate(applicant.birth_date)}</div>
              <div>Address: {applicant.address}</div>
              <div>City/State/ZIP: {applicant.city} {applicant.state} {applicant.zip_code}</div>
              <div>Status: {applicant.status}</div>
              <div className="text-xs text-gray-600">Created: {formatDate(applicant.created_at)}</div>
              <div className="text-xs text-gray-600">Updated: {formatDate(applicant.updated_at)}</div>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Coverage / Insurance</h2>
            <div className="mt-3 text-sm text-gray-800 space-y-1">
              <div>Current insurance: {applicant.current_insurance?.provider || "—"} ({applicant.current_insurance?.has_insurance || "N/A"})</div>
              <div>Coverage: {applicant.coverage_configs ? JSON.stringify(applicant.coverage_configs) : "—"}</div>
            </div>
          </section>
        </div>

        <section className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Drivers</h2>
          <div className="mt-3 divide-y divide-gray-100">
            {applicant.drivers.map((d) => (
              <div key={d.id} className="py-2 text-sm text-gray-800">
                <div className="font-semibold">{d.first_name} {d.last_name}</div>
                <div>Birth date: {formatDate(d.birth_date)}</div>
                <div>DL: {d.dl_state} {d.dl_number}</div>
              </div>
            ))}
            {applicant.drivers.length === 0 && <div className="text-sm text-gray-600">No drivers.</div>}
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Vehicles</h2>
          <div className="mt-3 divide-y divide-gray-100">
            {applicant.vehicles.map((v) => (
              <div key={v.id} className="py-2 text-sm text-gray-800">
                <div className="font-semibold">{v.year} {v.make} {v.model}</div>
                <div>VIN: {v.vin}</div>
                <div>Usage: {v.usage} · Mileage: {v.mileage}</div>
              </div>
            ))}
            {applicant.vehicles.length === 0 && <div className="text-sm text-gray-600">No vehicles.</div>}
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Latest Quote</h2>
          {latestExec ? (
            <div className="mt-2 text-sm text-gray-800 space-y-1">
              <div>Execution ID: {latestExec.quote_execution_id}</div>
              <div>Status: {latestExec.status}</div>
              <div className="text-xs text-gray-600">Created: {formatDate(latestExec.created_at)}</div>
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                {latestExec.quotes.map((q) => (
                  <div key={q.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="text-base font-semibold text-gray-900">{q.carrier_name || "Carrier"}</div>
                    <div className="text-lg font-bold text-gray-900">
                      {q.premium != null ? `$${q.premium.toString?.() || String(q.premium)}` : "N/A"}
                    </div>
                    {q.term && <div className="text-xs text-gray-600">Term: {q.term}</div>}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-2 text-sm text-gray-600">No quote executions yet.</div>
          )}
        </section>
      </div>
    </main>
  );
}
