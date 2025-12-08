"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Image from "next/image";
import { useState } from "react";

export default function Home() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [zip, setZip] = useState("");

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-white via-[#f4fffe] to-white text-gray-900">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60rem_60rem_at_50%_-10%,rgba(30,200,200,0.12),transparent)]"
          />
          <div className="mx-auto max-w-6xl px-6 pt-14 pb-12 md:pt-18 md:pb-18">
            <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">
              {/* LEFT — Headline */}
              <div className="text-center md:text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-teal-100 bg-white px-3 py-1 text-xs font-medium text-teal-700 shadow-sm">
                  Protego InsurTech · Trusted coverage, fast
                </div>
                <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-gray-900 md:text-5xl">
                  Compare auto insurance in minutes.
                </h1>
                <p className="mt-4 max-w-xl text-lg text-gray-600">
                  Start with Auto today—Home, Auto + Home, Condo, Rental coming soon. Smart quotes, transparent pricing, and coverage tailored to you.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3 md:justify-start">
                  <Link
                    href="/new?fresh=1"
                    className="rounded-lg bg-[#1EC8C8] px-5 py-3 text-sm font-semibold text-white shadow hover:bg-[#18b0b0] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1EC8C8]"
                  >
                    Start Auto Quote
                  </Link>
                  <Link
                    href="/renewal"
                    className="rounded-lg border border-teal-200 bg-white px-5 py-3 text-sm font-semibold text-teal-800 shadow-sm hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-200"
                  >
                    Renewal Tool
                  </Link>
                </div>
              </div>

              {/* RIGHT — Illustration */}
              <div className="flex justify-center">
                <Image
                  src="/brand/tomato and potato.png"
                  alt="Protego InsurTech"
                  width={520}
                  height={380}
                  priority
                  className="mx-auto rounded-lg shadow-lg"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Product entry cards */}
        <section className="mx-auto max-w-6xl px-6 pb-16">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-teal-700">Products</p>
              <h2 className="text-2xl font-semibold text-gray-900">Choose your path</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Link
              href="/new?fresh=1"
              className="group rounded-xl border border-teal-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Auto</h3>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                  Live
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-600">Compare carriers and get a quote.</p>
              <span className="mt-4 inline-block text-sm font-semibold text-teal-700">
                Start now →
              </span>
            </Link>

            {["Home", "Auto + Home", "Condo", "Rental"].map((label) => (
              <div
                key={label}
                className="rounded-xl border border-dashed border-gray-200 bg-gray-50/70 p-5 text-gray-500 shadow-inner"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-700">{label}</h3>
                  <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-600">
                    Coming soon
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-600">We’re building this next.</p>
              </div>
            ))}
          </div>
        </section>

        {/* Value props */}
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-teal-100 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900">Independent & Transparent</h3>
              <p className="mt-2 text-sm text-gray-600">
                We compare multiple carriers so you don’t have to. No hidden fees.
              </p>
            </div>
            <div className="rounded-xl border border-teal-100 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900">Data-driven Coverage</h3>
              <p className="mt-2 text-sm text-gray-600">
                Pricing and coverage suggestions grounded in your risk profile.
              </p>
            </div>
            <div className="rounded-xl border border-teal-100 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900">Simple, Human, AI-assisted</h3>
              <p className="mt-2 text-sm text-gray-600">
                Clear explanations, real people — with AI that speeds up the boring parts.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Protego InsurTech. All rights reserved.
            </p>
            <nav className="flex items-center gap-4 text-sm text-gray-600">
              <Link href="/login" className="hover:text-gray-900">
                Portal
              </Link>
              <Link href="/renewal" className="hover:text-gray-900">
                Renewal
              </Link>
              <Link href="/privacy" className="hover:text-gray-900">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-gray-900">
                Terms
              </Link>
            </nav>
          </div>
        </footer>
      </main>
    </>
  );
}
