import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function AgentHomePage() {
  const session = await getServerSession(authOptions as any);
  const role = (session as any)?.user?.role;

  if (role !== "agent") {
    redirect("/agent/login");
  }

  const name = (session as any)?.user?.name ?? "Agent";
  const email = (session as any)?.user?.email ?? "";

  // Count distinct applicants with quote executions
  const distinctApplicants = await prisma.quote_execution.findMany({
    select: { applicant_id: true },
    distinct: ["applicant_id"],
  });
  const newQuoteCount = distinctApplicants.length;
  const renewalCount = await prisma.renewal_policy.count();

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-wide text-[#0b6f6f]">Agent Portal</p>
          <h1 className="text-3xl font-semibold">Welcome, {name}</h1>
          <p className="text-sm text-gray-600">{email}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Left: Agent tools */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">Agent Tools</p>
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Carrier Assistant</div>
                  <div className="text-xs text-gray-600">
                    Ask eligibility/coverage questions with citations.
                  </div>
                </div>
                <a
                  href="/agent/carrier-assistant"
                  className="inline-flex items-center justify-center rounded-lg bg-[#1EC8C8] px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-[#19b3b3]"
                >
                  Open
                </a>
              </div>
              {/* Add more tools here as they are built */}
            </div>
          </div>

          {/* Right: Work items */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">Work Items</p>
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900">New Quotes</div>
                  <div className="text-xs text-gray-600">View and manage new quote submissions.</div>
                </div>
                <a
                  href="/agent/quotes"
                  className="text-lg font-semibold text-[#1EC8C8] underline decoration-2 underline-offset-4 hover:text-[#19b3b3]"
                >
                  {newQuoteCount}
                </a>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Renewals</div>
                  <div className="text-xs text-gray-600">Renewal policies and follow-ups.</div>
                </div>
                <a
                  href="/agent/renewals"
                  className="text-lg font-semibold text-[#1EC8C8] underline decoration-2 underline-offset-4 hover:text-[#19b3b3]"
                >
                  {renewalCount}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
