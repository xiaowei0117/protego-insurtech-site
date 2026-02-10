import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

function formatDate(value?: Date | string | null) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default async function AgentRenewalsListPage() {
  const session = await getServerSession(authOptions as any);
  const role = (session as any)?.user?.role;

  if (role !== "agent") {
    redirect("/agent/login");
  }

  const renewals = await prisma.renewal_policy.findMany({
    orderBy: { expiration_date: "asc" },
  });

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-[#0b6f6f]">Agent Portal</p>
            <h1 className="text-3xl font-semibold">Renewal Follow-ups</h1>
            <p className="text-sm text-gray-600">
              Policies requiring renewal outreach and document review.
            </p>
          </div>
          <a
            href="/agent"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            Back to Agent Home
          </a>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="grid grid-cols-[repeat(12,minmax(0,1fr))] bg-gray-50 px-4 py-3 text-xs font-semibold uppercase text-gray-600">
            <div className="col-span-1">Item #</div>
            <div className="col-span-2">Policy #</div>
            <div className="col-span-2">Name</div>
            <div className="col-span-2">Expiration</div>
            <div className="col-span-2">LOB</div>
            <div className="col-span-2">Carrier</div>
            <div className="col-span-1 text-right">Premium</div>
          </div>
          <div className="divide-y divide-gray-100">
            {renewals.map((r) => (
              <div key={r.id} className="grid grid-cols-[repeat(12,minmax(0,1fr))] px-4 py-3 text-sm text-gray-800">
                <div className="col-span-1 font-semibold text-gray-900">
                  <Link
                    href={`/agent/renewals/${r.id}`}
                    className="text-[#1EC8C8] underline hover:text-[#19b3b3]"
                  >
                    {r.id}
                  </Link>
                </div>
                <div className="col-span-2 font-semibold text-gray-900">
                  <Link
                    href={`/agent/renewals/${r.id}`}
                    className="text-[#1EC8C8] underline hover:text-[#19b3b3]"
                  >
                    {r.policy_number}
                  </Link>
                </div>
                <div className="col-span-2">
                  {r.first_name} {r.last_name}
                </div>
                <div className="col-span-2 text-gray-700">
                  {formatDate(r.expiration_date)}
                </div>
                <div className="col-span-2 text-gray-700">{r.line_of_business}</div>
                <div className="col-span-2 text-gray-700">{r.writing_carrier}</div>
                <div className="col-span-1 text-right font-semibold text-gray-900">
                  {r.policy_premium ? `$${Number(r.policy_premium).toLocaleString()}` : ""}
                </div>
              </div>
            ))}
            {renewals.length === 0 && (
              <div className="px-4 py-6 text-sm text-gray-600">No renewals to follow up.</div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
