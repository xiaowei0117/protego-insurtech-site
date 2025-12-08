import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    // Not signed in
    return (
      <main className="min-h-screen flex items-center justify-center text-center p-8">
        <div className="text-gray-700">
          <p className="text-lg font-semibold">Please sign in</p>
          <Link
            href="/api/auth/signin?callbackUrl=/dashboard"
            className="text-blue-600 underline mt-2 inline-block"
          >
            Go to Login
          </Link>
        </div>
      </main>
    );
  }

  const role = (session.user as any).role;

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-white text-gray-900">
      <div className="w-full max-w-xl space-y-6 text-left">
        <div>
          <p className="text-sm text-gray-500">Welcome back</p>
          <h1 className="text-2xl font-semibold">
            {session.user?.name || session.user?.email}
          </h1>
          <p className="text-gray-600 mt-2 text-sm">
            Choose what you want to do next.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-teal-100 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-[#0b6f6f]">Policies</p>
            <h2 className="mt-1 text-lg font-semibold text-gray-900">My Policy</h2>
            <p className="mt-1 text-sm text-gray-600">Manage policies and download documents.</p>
            <button
              disabled
              className="mt-3 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-500 cursor-not-allowed"
            >
              Coming soon
            </button>
          </div>

          <div className="rounded-xl border border-teal-100 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-[#0b6f6f]">Quotes</p>
            <h2 className="mt-1 text-lg font-semibold text-gray-900">My Quotes</h2>
            <p className="mt-1 text-sm text-gray-600">View saved quotes or start a new one.</p>
            <div className="mt-3 flex gap-2">
              <Link
                href="/quotes"
                className="inline-flex items-center justify-center rounded-lg bg-[#1EC8C8] px-3 py-2 text-sm font-semibold text-white hover:bg-[#19b3b3]"
              >
                Go to My Quotes
              </Link>
              <Link
                href="/new?fresh=1"
                className="inline-flex items-center justify-center rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm font-semibold text-[#0b6f6f] hover:bg-teal-50"
              >
                New Quote
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
