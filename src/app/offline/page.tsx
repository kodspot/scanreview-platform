export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#f8fafc_100%)] px-6 py-12 text-slate-950">
      <div className="mx-auto max-w-xl rounded-[32px] border border-black/10 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.1)]">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Offline mode</p>
        <h1 className="mt-3 text-3xl font-semibold">You are currently offline</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          Internet is unavailable. Reconnect and refresh to access live dashboards, authentication,
          and tenant data.
        </p>
      </div>
    </div>
  );
}
