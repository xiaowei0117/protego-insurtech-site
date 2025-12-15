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
  const renewalCount = 0;

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-wide text-[#0b6f6f]">Agent Portal</p>
          <h1 className="text-3xl font-semibold">Welcome, {name}</h1>
          <p className="text-sm text-gray-600">{email}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">New Quotes</p>
            <div className="mt-1 text-2xl font-semibold text-gray-900">
              <a
                href="/agent/quotes"
                className="text-[#1EC8C8] underline decoration-2 underline-offset-4 hover:text-[#19b3b3]"
              >
                {newQuoteCount}
              </a>
            </div>
            <p className="text-sm text-gray-600">View and manage new quote submissions.</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">Renewals</p>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{renewalCount}</div>
            <p className="text-sm text-gray-600">Renewal policies and follow-ups.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
