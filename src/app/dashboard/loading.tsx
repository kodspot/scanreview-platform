export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.18),_transparent_36%),linear-gradient(180deg,#fff7ed_0%,#f8fafc_100%)] px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[36px] border border-black/10 bg-white p-8">
          <div className="h-3 w-40 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-9 w-72 animate-pulse rounded bg-slate-200" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-[22px] bg-slate-100" />
            ))}
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="h-56 animate-pulse rounded-[22px] bg-slate-100" />
            <div className="h-56 animate-pulse rounded-[22px] bg-slate-100" />
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="h-72 animate-pulse rounded-[22px] bg-slate-100" />
            <div className="h-72 animate-pulse rounded-[22px] bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
