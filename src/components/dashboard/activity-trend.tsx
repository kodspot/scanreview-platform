interface TrendPoint {
  date: string;
  reviewCount: number;
  scanCount: number;
  averageRating: number;
}

interface ActivityTrendProps {
  trend: TrendPoint[];
  /** How many days to render. Defaults to 14. */
  days?: number;
}

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ActivityTrend({ trend, days = 14 }: ActivityTrendProps) {
  // Build a continuous N-day window so empty days are visible as ghosts.
  const byDate = new Map<string, TrendPoint>();
  for (const p of trend) byDate.set(p.date, p);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const points: TrendPoint[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = formatYmd(d);
    points.push(
      byDate.get(key) || { date: key, reviewCount: 0, scanCount: 0, averageRating: 0 },
    );
  }

  const totalScans = points.reduce((s, p) => s + p.scanCount, 0);
  const totalReviews = points.reduce((s, p) => s + p.reviewCount, 0);
  const maxValue = Math.max(1, ...points.map((p) => Math.max(p.scanCount, p.reviewCount)));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>
          <span className="text-base font-semibold text-slate-900">{totalScans}</span>{" "}
          <span className="uppercase tracking-[0.16em]">scans</span>
        </span>
        <span>
          <span className="text-base font-semibold text-slate-900">{totalReviews}</span>{" "}
          <span className="uppercase tracking-[0.16em]">reviews</span>
        </span>
        <span className="ml-auto text-slate-400">Last {days} days</span>
      </div>

      <div
        className="flex items-end gap-1.5 h-32 rounded-[12px] bg-slate-50 px-2 py-2"
        role="img"
        aria-label={`Daily scans and reviews — ${totalScans} scans and ${totalReviews} reviews over the last ${days} days`}
      >
        {points.map((p) => {
          const scanH = (p.scanCount / maxValue) * 100;
          const reviewH = (p.reviewCount / maxValue) * 100;
          const isEmpty = p.scanCount === 0 && p.reviewCount === 0;
          return (
            <div
              key={p.date}
              className="group relative flex-1 min-w-[6px] flex flex-col-reverse gap-0.5"
            >
              <div
                className="w-full rounded-t-sm bg-sky-500/90 transition-colors group-hover:bg-sky-600"
                style={{ height: `${scanH}%`, minHeight: p.scanCount > 0 ? "3px" : "0" }}
                title={`${p.date}: ${p.scanCount} scans`}
              />
              <div
                className="w-full rounded-t-sm bg-emerald-500 transition-colors group-hover:bg-emerald-600"
                style={{ height: `${reviewH}%`, minHeight: p.reviewCount > 0 ? "3px" : "0" }}
                title={`${p.date}: ${p.reviewCount} reviews`}
              />
              {isEmpty ? (
                <div className="w-full h-[2px] rounded-sm bg-slate-200" aria-hidden="true" />
              ) : null}
              <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100 pointer-events-none">
                {p.date}
                <br />
                {p.scanCount} scans · {p.reviewCount} reviews
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-sky-500/90" /> Scans
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Reviews
        </span>
        {totalScans > 0 ? (
          <span className="ml-auto">
            Conversion{" "}
            <span className="font-semibold text-slate-900">
              {((Math.min(totalReviews, totalScans) / totalScans) * 100).toFixed(1)}%
            </span>
          </span>
        ) : null}
      </div>
    </div>
  );
}
