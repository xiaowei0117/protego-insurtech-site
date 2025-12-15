import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import AgentCreator from "./AgentCreator";

export default async function AgentLoginPage() {
  const session = await getServerSession(authOptions as any);
  const role = (session as any)?.user?.role;

  if (role === "agent") {
    redirect("/agent");
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-10">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-wide text-[#0b6f6f]">Agent Portal</p>
          <h1 className="text-3xl font-semibold">Sign in as Agent</h1>
          <p className="mt-2 text-sm text-gray-600">
            Use your agent credentials to access quotes and renewals.
          </p>
        </div>

        <div className="space-y-3">
          <a
            href="/api/auth/signin?callbackUrl=/agent"
            className="flex w-full items-center justify-center rounded-lg bg-[#1EC8C8] px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#19b3b3]"
          >
            Continue with Google / SSO
          </a>
          <a
            href="/api/auth/signin?callbackUrl=/agent"
            className="flex w-full items-center justify-center rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-100"
          >
            Email login
          </a>
        </div>

        <AgentCreator />

        <p className="mt-6 text-center text-xs text-gray-500">
          Need help? Contact admin to get an agent account.
        </p>
      </div>
    </main>
  );
}
