interface TrendPoint {
  date: string;
  reviewCount: number;
  scanCount: number;
  averageRating: number;
}

interface ActivityTrendProps {
  trend: TrendPoint[];
}

export function ActivityTrend({ trend }: ActivityTrendProps) {
  if (!trend || trend.length === 0) {
    return (
      <div className="rounded-[16px] border border-dashed border-black/10 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
        No activity yet — scans and reviews will appear here as they come in.
      </div>
    );
  }

  // Use most recent 30 points
  const points = trend.slice(-30);
  const maxValue = Math.max(1, ...points.map((p) => Math.max(p.scanCount, p.reviewCount)));

  return (
    <div>
      <div className="flex items-end gap-1.5 h-32" role="img" aria-label="Daily scans and reviews trend">
        {points.map((p) => {
          const scanH = (p.scanCount / maxValue) * 100;
          const reviewH = (p.reviewCount / maxValue) * 100;
          return (
            <div key={p.date} className="group relative flex-1 min-w-[6px] flex flex-col-reverse gap-0.5">
              <div
                className="w-full rounded-t-sm bg-slate-300"
                style={{ height: `${scanH}%`, minHeight: p.scanCount > 0 ? "2px" : "0" }}
                title={`${p.date}: ${p.scanCount} scans`}
              />
              <div
                className="w-full rounded-t-sm bg-emerald-500"
                style={{ height: `${reviewH}%`, minHeight: p.reviewCount > 0 ? "2px" : "0" }}
                title={`${p.date}: ${p.reviewCount} reviews`}
              />
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-0.5 text-[10px] text-white opacity-0 transition group-hover:opacity-100 pointer-events-none">
                {p.date}: {p.scanCount} scans · {p.reviewCount} reviews
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-300" /> Scans
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Reviews
        </span>
        <span className="ml-auto">Last {points.length} days</span>
      </div>
    </div>
  );
}
