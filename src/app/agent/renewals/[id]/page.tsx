import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import RenewalWorkflowClient from "./RenewalWorkflowClient";

function formatDate(value?: Date | string | null) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default async function AgentRenewalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const session = await getServerSession(authOptions as any);
  const role = (session as any)?.user?.role;

  if (role !== "agent") {
    redirect("/agent/login");
  }

  const id = Number(rawId);
  if (!Number.isFinite(id)) {
    redirect("/agent/renewals");
  }

  const policy = await prisma.renewal_policy.findUnique({
    where: { id },
  });

  if (!policy) {
    redirect("/agent/renewals");
  }

  const policyForClient = {
    id: policy.id,
    policyNumber: policy.policy_number,
    firstName: policy.first_name,
    lastName: policy.last_name,
    expirationDate: policy.expiration_date
      ? policy.expiration_date.toISOString().slice(0, 10)
      : null,
    lineOfBusiness: policy.line_of_business,
    writingCarrier: policy.writing_carrier,
    policyPremium: policy.policy_premium ? Number(policy.policy_premium) : null,
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-[#0b6f6f]">Agent Portal</p>
            <h1 className="text-3xl font-semibold">Renewal Review</h1>
            <p className="text-sm text-gray-600">
              Policy {policy.policy_number} · Item {policy.id}
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
                {policy.first_name} {policy.last_name}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Expiration</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatDate(policy.expiration_date)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Premium</p>
              <p className="text-lg font-semibold text-gray-900">
                {policy.policy_premium ? `$${Number(policy.policy_premium).toLocaleString()}` : ""}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Line of Business</p>
              <p className="text-sm text-gray-700">{policy.line_of_business}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Writing Carrier</p>
              <p className="text-sm text-gray-700">{policy.writing_carrier}</p>
            </div>
          </div>
        </div>

        <RenewalWorkflowClient policy={policyForClient} />
      </div>
    </main>
  );
}
