"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Hook for future error tracking (Sentry, Logflare, etc.)
    if (process.env.NODE_ENV !== "production") {
      console.error("[ScanReview] route error:", error);
    }
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-md rounded-[28px] border border-black/10 bg-white p-8 shadow-[0_18px_60px_rgba(15,23,42,0.12)]">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Something went wrong</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-950">We hit a snag</h1>
        <p className="mt-3 text-sm text-slate-600">
          The page failed to load. The team has been notified. You can try again or head back home.
        </p>
        {error?.digest ? (
          <p className="mt-3 break-all rounded-[14px] bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
            Reference: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => reset()}
            type="button"
            className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
