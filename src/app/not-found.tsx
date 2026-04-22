import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#fff7ed_0%,#f8fafc_100%)] px-6">
      <div className="max-w-lg rounded-[32px] border border-black/10 bg-white p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.1)]">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Kodspot ScanReview</p>
        <h1 className="mt-4 text-4xl font-semibold text-slate-950">Review page not found</h1>
        <p className="mt-4 text-base text-slate-600">
          The QR destination may be paused, invalid, or not yet provisioned for this organization.
        </p>
        <Link className="mt-8 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white" href="/">
          Go back home
        </Link>
      </div>
    </div>
  );
}
