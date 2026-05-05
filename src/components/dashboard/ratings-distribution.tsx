interface DistributionPoint {
  rating: number;
  count: number;
}

interface RatingsDistributionProps {
  distribution: DistributionPoint[];
  maxRating: number;
}

export function RatingsDistribution({ distribution, maxRating }: RatingsDistributionProps) {
  // Build a complete row from 1..maxRating so empty ratings are visible.
  const total = distribution.reduce((sum, p) => sum + p.count, 0);
  const byRating = new Map(distribution.map((p) => [p.rating, p.count]));

  const rows = Array.from({ length: maxRating }, (_, i) => {
    const rating = maxRating - i; // top to bottom, 5 → 1
    const count = byRating.get(rating) || 0;
    const pct = total === 0 ? 0 : Math.round((count / total) * 100);
    return { rating, count, pct };
  });

  if (total === 0) {
    return (
      <div className="rounded-[16px] border border-dashed border-black/10 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
        No reviews yet — once feedback comes in, the distribution will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.rating} className="flex items-center gap-3 text-sm">
          <div className="w-10 shrink-0 text-right font-semibold text-slate-800">
            {row.rating}★
          </div>
          <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
              style={{ width: `${row.pct}%` }}
              aria-hidden="true"
            />
          </div>
          <div className="w-20 shrink-0 text-right text-xs text-slate-500 tabular-nums">
            {row.count} <span className="text-slate-400">· {row.pct}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}
