"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const callbackUrl = useMemo(
    () => searchParams.get("callbackUrl") || "/dashboard",
    [searchParams]
  );

  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "CredentialsSignin" || err === "AccessDenied") {
      setError(
        "We couldn't find an account with that email. After you get a quote, you can sign in to see your quote and edit anytime!"
      );
      return;
    }
    if (err) {
      setError("Sign-in failed. Please try again.");
      return;
    }
    setError(null);
  }, [searchParams]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="w-full max-w-sm rounded-xl bg-white border border-gray-200 shadow p-6 space-y-6">
        <div className="flex flex-col items-center space-y-2">
          <div className="h-12 w-12 rounded-full bg-gray-200" aria-hidden />
          <div className="text-sm font-semibold text-gray-800">
            Protego InsureTech
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Sign in</h1>
        </div>

        {/* Google login */}
        <button
          onClick={() => signIn("google", { callbackUrl })}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          Continue with Google
        </button>

        {/* Dev login for testing without Google */}
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const email = (
              e.currentTarget.elements.namedItem("email") as HTMLInputElement
            ).value;
            const result = await signIn("credentials", {
              email,
              redirect: false,
            });
            if (result?.ok) {
              await router.push(callbackUrl);
            } else {
              setError(
                "We couldn't find an account with that email. Please try again."
              );
            }
          }}
        >
          <div className="text-xs text-gray-500 text-center">
            Sign in with your email
          </div>
          <input
            name="email"
            type="email"
            required
            placeholder="agent@example.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Continue with Email
          </button>
        </form>

        {error && (
          <p className="text-[11px] text-center text-red-600 leading-relaxed">
            {error}
          </p>
        )}

        <Link
          href="/"
          className="block w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 text-center hover:bg-gray-100"
        >
          Back to Home
        </Link>

        <p className="text-[11px] text-center text-gray-500 leading-relaxed">
          Only authorized users can access internal tools.
        </p>
      </div>
    </main>
  );
}
