export default function SuperAdminLoading() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#f8fafc_100%)] px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[36px] border border-black/10 bg-white p-8">
          <div className="h-3 w-40 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-9 w-80 animate-pulse rounded bg-slate-200" />
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-[22px] bg-slate-100" />
            ))}
          </div>
          <div className="mt-6 h-72 animate-pulse rounded-[22px] bg-slate-100" />
          <div className="mt-6 h-96 animate-pulse rounded-[22px] bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
