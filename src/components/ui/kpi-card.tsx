interface KpiCardProps {
  label: string;
  value: string;
  helper: string;
}

export function KpiCard({ label, value, helper }: KpiCardProps) {
  return (
    <article className="rounded-[28px] border border-black/10 bg-white/90 p-6 shadow-[0_16px_60px_rgba(15,23,42,0.08)] backdrop-blur">
      <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{helper}</p>
    </article>
  );
}
