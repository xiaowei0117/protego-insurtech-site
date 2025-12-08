"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openCompare, setOpenCompare] = useState(false);
  const { data: session, status } = useSession();

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname?.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-teal-300 bg-[#1EC8C8] text-white shadow">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
        {/* Brand / Logo placeholder */}
        <Link
          href="/"
          className="inline-flex items-center gap-3 rounded-lg px-2 py-1"
          aria-label="Protego InsurTech Home"
        >
          <div className="h-9 w-9 rounded-full border-2 border-white/70 bg-white/20" />
          <div className="flex flex-col leading-tight">
            <span className="text-base font-semibold">Protego InsurTech</span>
            <span className="text-xs text-white/80">Insurance made clear</span>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-2 md:flex">
          <div className="relative">
            <button
              onClick={() => setOpenCompare((v) => !v)}
              className="rounded-lg px-3 py-2 text-sm font-semibold transition-colors hover:bg-white/15"
            >
              Compare
            </button>
            {openCompare && (
              <div className="absolute left-0 mt-2 w-44 rounded-lg border border-white/30 bg-white text-gray-900 shadow-lg">
                <Link
                  href="/new"
                  className="block px-3 py-2 text-sm hover:bg-gray-50"
                  onClick={() => {
                    setOpenCompare(false);
                  }}
                >
                  Auto Insurance
                </Link>
                <span className="block px-3 py-2 text-sm text-gray-400 cursor-not-allowed">
                  Home (coming)
                </span>
                <span className="block px-3 py-2 text-sm text-gray-400 cursor-not-allowed">
                  Auto + Home (coming)
                </span>
                <span className="block px-3 py-2 text-sm text-gray-400 cursor-not-allowed">
                  Condo (coming)
                </span>
                <span className="block px-3 py-2 text-sm text-gray-400 cursor-not-allowed">
                  Rental (coming)
                </span>
              </div>
            )}
          </div>

          <Link
            href="/renewal"
            className={[
              "rounded-lg px-3 py-2 text-sm font-semibold transition-colors hover:bg-white/15",
              isActive("/renewal") ? "bg-white/15" : "",
            ].join(" ")}
          >
            Renewal Tool
          </Link>
          <Link
            href="/quotes"
            className={[
              "rounded-lg px-3 py-2 text-sm font-semibold transition-colors hover:bg-white/15",
              isActive("/quotes") ? "bg-white/15" : "",
            ].join(" ")}
          >
            My Quotes
          </Link>
          <Link
            href="/pricing"
            className={[
              "rounded-lg px-3 py-2 text-sm font-semibold transition-colors hover:bg-white/15",
              isActive("/pricing") ? "bg-white/15" : "",
            ].join(" ")}
          >
            Pricing
          </Link>
          <Link
            href="/about"
            className={[
              "rounded-lg px-3 py-2 text-sm font-semibold transition-colors hover:bg-white/15",
              isActive("/about") ? "bg-white/15" : "",
            ].join(" ")}
          >
            About
          </Link>
        </div>

        {/* Right side CTAs */}
        <div className="hidden items-center gap-2 md:flex">
          {status === "authenticated" ? (
            <>
              <Link
                href="/quotes"
                className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-[#0b6f6f] shadow hover:bg-white/90"
              >
                My Quotes
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-lg border border-white/60 bg-white/20 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-white/30"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/api/auth/signin?callbackUrl=/dashboard"
                className="rounded-lg border border-white/60 bg-white/20 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-white/30"
              >
                Sign in
              </Link>
              <Link
                href="/new?fresh=1"
                className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-[#0b6f6f] shadow hover:bg-white/90"
              >
                Get a quote
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center rounded-lg px-3 py-2 text-white ring-1 ring-white/40 hover:bg-white/15 md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden bg-[#1EC8C8] text-white">
          <div className="mx-auto max-w-6xl px-4 pb-4">
            <div className="grid gap-1 rounded-xl border border-white/30 bg-white/10 p-2">
              <div className="rounded-lg bg-white/15">
                <button
                  onClick={() => setOpenCompare((v) => !v)}
                  className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold"
                >
                  Compare
                  <span>{openCompare ? "▴" : "▾"}</span>
                </button>
                {openCompare && (
                  <div className="border-t border-white/20">
                    <Link
                      href="/new"
                      onClick={() => {
                        setOpen(false);
                        setOpenCompare(false);
                      }}
                      className="block px-3 py-2 text-sm hover:bg-white/10"
                    >
                      Auto Insurance
                    </Link>
                    <span className="block px-3 py-2 text-sm text-white/70">
                      Home (coming)
                    </span>
                    <span className="block px-3 py-2 text-sm text-white/70">
                      Auto + Home (coming)
                    </span>
                    <span className="block px-3 py-2 text-sm text-white/70">
                      Condo (coming)
                    </span>
                    <span className="block px-3 py-2 text-sm text-white/70">
                      Rental (coming)
                    </span>
                  </div>
                )}
              </div>

              <Link
                href="/renewal"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-white/15"
              >
                Renewal Tool
              </Link>
              <Link
                href="/quotes"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-white/15"
              >
                My Quotes
              </Link>
              <Link
                href="/pricing"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-white/15"
              >
                Pricing
              </Link>
              <Link
                href="/about"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-white/15"
              >
                About
              </Link>

              <div className="mt-2 grid grid-cols-2 gap-2">
                {status === "authenticated" ? (
                  <>
                    <Link
                      href="/quotes"
                      onClick={() => setOpen(false)}
                      className="rounded-lg bg-white px-3 py-2 text-center text-sm font-semibold text-[#0b6f6f]"
                    >
                      My Quotes
                    </Link>
                    <button
                      onClick={() => {
                        setOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                      className="rounded-lg border border-white/40 bg-white/15 px-3 py-2 text-center text-sm font-semibold text-white"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/api/auth/signin?callbackUrl=/dashboard"
                      onClick={() => setOpen(false)}
                      className="rounded-lg border border-white/40 bg-white/15 px-3 py-2 text-center text-sm font-semibold text-white"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/new?fresh=1"
                      onClick={() => setOpen(false)}
                      className="rounded-lg bg-white px-3 py-2 text-center text-sm font-semibold text-[#0b6f6f]"
                    >
                      Get a quote
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
