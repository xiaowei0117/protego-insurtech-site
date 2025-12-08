"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

interface QuoteRecord {
  id: number;
  quote_execution_id: string;
  carrier_name: string | null;
  premium: string | null;
  created_at: string;
  applicant: {
    id: number;
    first_name: string | null;
    last_name: string | null;
    xref_key: string | null;
    coverage_configs: {
      bi_pd_liability: string | null;
      uninsured_motorist: string | null;
      pip: string | null;
      collision: string | null;
      comprehensive: string | null;
      rental: string | null;
      roadside_assistance: string | null;
      umbrella: string | null;
      gap: string | null;
      glass_coverage: string | null;
    } | null;
    _count: {
      drivers: number;
      vehicles: number;
    };
  };
  quotes: Array<{
    id: number;
    carrier_name: string | null;
    premium: string | null;
    term: string | null;
    created_at: string;
  }>;
}

export default function QuotesPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<QuoteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/my/quotes");
        if (res.status === 401) {
          setError("Please sign in to view your saved quotes.");
          setLoading(false);
          return;
        }
        const json = await res.json();
        setData(json || []);
      } catch (e: any) {
        setError(e?.message || "Failed to load quotes.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-[#0b6f6f]">My quotes</p>
            <h1 className="text-2xl font-semibold">Saved quote history</h1>
            <p className="text-sm text-gray-600">
              View or re-open your saved quotes. New here?{" "}
              <Link href="/new?fresh=1" className="text-[#1EC8C8] underline">
                Start a quote
              </Link>
              .
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
              Back to Dashboard
            </Link>
            {!session?.user && (
              <Link
                href="/api/auth/signin?callbackUrl=/dashboard"
                className="rounded-lg bg-[#1EC8C8] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#19b3b3]"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>

        {loading && <p className="text-sm text-gray-600">Loading quotes...</p>}
        {error && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {error}
          </div>
        )}

        {!loading && !error && data.length === 0 && (
          <p className="text-sm text-gray-600">No saved quotes yet.</p>
        )}

        <div className="grid grid-cols-1 gap-4">
          {data.map((exec) => {
            const primaryQuote = exec.quotes?.[0] || null;
            return (
              <div
                key={exec.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm text-gray-600">
                      Applicant #{exec.applicant?.id} •{" "}
                      {exec.applicant?.first_name} {exec.applicant?.last_name}
                    </div>
                    <div className="text-base font-semibold text-gray-900">
                      {primaryQuote?.carrier_name || exec.carrier_name || "Quote"}
                    </div>
                    <div className="text-sm text-gray-600">
                      {exec.applicant?._count?.drivers ?? 0} drivers •{" "}
                      {exec.applicant?._count?.vehicles ?? 0} vehicles
                    </div>
                    {exec.applicant?.coverage_configs && (
                      <div className="text-sm text-gray-500">
                        Coverage:{" "}
                        {[
                          exec.applicant.coverage_configs.bi_pd_liability && `BI/PD ${exec.applicant.coverage_configs.bi_pd_liability}`,
                          exec.applicant.coverage_configs.uninsured_motorist && `UM ${exec.applicant.coverage_configs.uninsured_motorist}`,
                          exec.applicant.coverage_configs.collision && `Collision ${exec.applicant.coverage_configs.collision}`,
                          exec.applicant.coverage_configs.comprehensive && `Comp ${exec.applicant.coverage_configs.comprehensive}`,
                          exec.applicant.coverage_configs.rental && `Rental ${exec.applicant.coverage_configs.rental}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    )}
                    <div className="text-sm text-gray-500">
                      {new Date(exec.created_at).toLocaleString()}
                    </div>
                  </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">
                  {primaryQuote?.premium || exec.premium
                    ? `$${primaryQuote?.premium || exec.premium}`
                    : "—"}
                </div>
                <Link
                  href={`/new?applicantId=${exec.applicant?.id ?? ""}${
                    exec.applicant?.xref_key ? `&xref=${encodeURIComponent(exec.applicant.xref_key)}` : ""
                  }`}
                  className="mt-2 inline-block text-sm font-semibold text-[#1EC8C8] underline"
                >
                  Re-open & edit
                </Link>
              </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
