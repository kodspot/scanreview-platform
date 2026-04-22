import type { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function SectionCard({ title, description, action, children }: SectionCardProps) {
  return (
    <section className="rounded-[32px] border border-black/10 bg-white p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
