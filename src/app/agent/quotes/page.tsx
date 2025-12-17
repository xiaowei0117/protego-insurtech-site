import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

function formatDate(value?: Date | string | null) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString();
}

export default async function AgentQuotesListPage() {
  const session = await getServerSession(authOptions as any);
  const role = (session as any)?.user?.role;

  if (role !== "agent") {
    redirect("/agent/login");
  }

  const applicants = await prisma.applicant.findMany({
    where: {
      quote_executions: {
        some: {},
      },
    },
    orderBy: { updated_at: "desc" },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      birth_date: true,
      address: true,
      city: true,
      state: true,
      zip_code: true,
      phone: true,
      email: true,
      status: true,
      created_at: true,
      updated_at: true,
    },
  });

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-[#0b6f6f]">Agent Portal</p>
            <h1 className="text-3xl font-semibold">Applicants with Quotes</h1>
            <p className="text-sm text-gray-600">Listing distinct applicants that have quote executions.</p>
          </div>
          <a
            href="/agent"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            Back to Agent Home
          </a>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="grid grid-cols-[repeat(14,minmax(0,1fr))] bg-gray-50 px-4 py-3 text-xs font-semibold uppercase text-gray-600">
            <div className="col-span-2">Applicant ID</div>
            <div className="col-span-2">Name</div>
            <div className="col-span-2">Contact</div>
            <div className="col-span-3">Address</div>
            <div className="col-span-1">Birth Date</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2">Timestamps</div>
            <div className="col-span-1 text-right">Operation</div>
          </div>
          <div className="divide-y divide-gray-100">
            {applicants.map((a) => (
              <div key={a.id} className="grid grid-cols-[repeat(14,minmax(0,1fr))] px-4 py-3 text-sm text-gray-800">
                <div className="col-span-2 font-semibold text-gray-900">
                  <Link href={`/agent/quotes/${a.id}`} className="text-[#1EC8C8] underline hover:text-[#19b3b3]">
                    {a.id}
                  </Link>
                </div>
                <div className="col-span-2">
                  {a.first_name} {a.last_name}
                </div>
                <div className="col-span-2">
                  <div>{a.phone}</div>
                  <div className="text-xs text-gray-500">{a.email}</div>
                </div>
                <div className="col-span-3 text-gray-700">
                  <div>{a.address}</div>
                  <div>
                    {a.city} {a.state} {a.zip_code}
                  </div>
                </div>
                <div className="col-span-1 text-gray-700">{a.birth_date ? formatDate(a.birth_date) : ""}</div>
                <div className="col-span-1 text-gray-700 capitalize">{a.status || ""}</div>
                <div className="col-span-2 text-xs text-gray-600">
                  <div>Created: {formatDate(a.created_at)}</div>
                  <div>Updated: {formatDate(a.updated_at)}</div>
                </div>
                <div className="col-span-1 text-right">
                  <Link
                    href={`/agent/quotes/${a.id}`}
                    className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-[#0b6f6f] hover:bg-gray-100"
                  >
                    查询
                  </Link>
                </div>
              </div>
            ))}
            {applicants.length === 0 && (
              <div className="px-4 py-6 text-sm text-gray-600">No applicants with quotes yet.</div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
