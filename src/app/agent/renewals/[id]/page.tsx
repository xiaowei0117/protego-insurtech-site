import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { mockRenewals } from "../mockRenewals";
import RenewalWorkflowClient from "./RenewalWorkflowClient";

type Params = {
  params: { id: string };
};

export default async function AgentRenewalDetailPage({ params }: Params) {
  const session = await getServerSession(authOptions as any);
  const role = (session as any)?.user?.role;

  if (role !== "agent") {
    redirect("/agent/login");
  }

  const policy = mockRenewals.find((r) => r.id === params.id);

  if (!policy) {
    redirect("/agent/renewals");
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-[#0b6f6f]">Agent Portal</p>
            <h1 className="text-3xl font-semibold">Renewal Review</h1>
            <p className="text-sm text-gray-600">
              Policy {policy.policyNumber} · Item {policy.itemNumber}
            </p>
          </div>
          <a
            href="/agent/renewals"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            Back to Renewal List
          </a>
        </div>

        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase text-gray-500">Insured</p>
              <p className="text-lg font-semibold text-gray-900">
                {policy.firstName} {policy.lastName}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Expiration</p>
              <p className="text-lg font-semibold text-gray-900">{policy.expirationDate}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Premium</p>
              <p className="text-lg font-semibold text-gray-900">
                ${policy.policyPremium.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Line of Business</p>
              <p className="text-sm text-gray-700">{policy.lineOfBusiness}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Writing Carrier</p>
              <p className="text-sm text-gray-700">{policy.writingCarrier}</p>
            </div>
          </div>
        </div>

        <RenewalWorkflowClient policy={policy} />
      </div>
    </main>
  );
}
