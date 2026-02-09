import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { mockRenewals } from "./mockRenewals";

export default async function AgentRenewalsListPage() {
  const session = await getServerSession(authOptions as any);
  const role = (session as any)?.user?.role;

  if (role !== "agent") {
    redirect("/agent/login");
  }

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
            {mockRenewals.map((r) => (
              <div key={r.id} className="grid grid-cols-[repeat(12,minmax(0,1fr))] px-4 py-3 text-sm text-gray-800">
                <div className="col-span-1 font-semibold text-gray-900">
                  <Link
                    href={`/agent/renewals/${r.id}`}
                    className="text-[#1EC8C8] underline hover:text-[#19b3b3]"
                  >
                    {r.itemNumber}
                  </Link>
                </div>
                <div className="col-span-2 font-semibold text-gray-900">
                  <Link
                    href={`/agent/renewals/${r.id}`}
                    className="text-[#1EC8C8] underline hover:text-[#19b3b3]"
                  >
                    {r.policyNumber}
                  </Link>
                </div>
                <div className="col-span-2">
                  {r.firstName} {r.lastName}
                </div>
                <div className="col-span-2 text-gray-700">{r.expirationDate}</div>
                <div className="col-span-2 text-gray-700">{r.lineOfBusiness}</div>
                <div className="col-span-2 text-gray-700">{r.writingCarrier}</div>
                <div className="col-span-1 text-right font-semibold text-gray-900">
                  ${r.policyPremium.toLocaleString()}
                </div>
              </div>
            ))}
            {mockRenewals.length === 0 && (
              <div className="px-4 py-6 text-sm text-gray-600">No renewals to follow up.</div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
