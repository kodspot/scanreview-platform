import Link from "next/link";
import type { ReactNode } from "react";

type ChipTone = "neutral" | "print" | "pdf";
type ChipIcon = "external" | "sheet" | "pdf";

interface ActionChipLinkProps {
  href: string;
  label: string;
  tone: ChipTone;
  icon: ChipIcon;
  target?: string;
}

function Icon({ kind }: { kind: ChipIcon }) {
  if (kind === "pdf") {
    return (
      <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 2.5h5l3 3V13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.25"/>
        <path d="M9 2.5V6h3" stroke="currentColor" strokeWidth="1.25"/>
      </svg>
    );
  }

  if (kind === "sheet") {
    return (
      <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
        <rect height="10" rx="1.25" stroke="currentColor" strokeWidth="1.25" width="10" x="3" y="3"/>
        <path d="M6 6h4M6 8h4M6 10h4" stroke="currentColor" strokeWidth="1.25"/>
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 4h6v6" stroke="currentColor" strokeWidth="1.25"/>
      <path d="M10 4 4 10" stroke="currentColor" strokeWidth="1.25"/>
      <path d="M12 9.5V12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h2.5" stroke="currentColor" strokeWidth="1.25"/>
    </svg>
  );
}

function getToneClass(tone: ChipTone) {
  if (tone === "print") {
    return "border-teal-200 bg-teal-50 text-teal-900 hover:bg-teal-100";
  }
  if (tone === "pdf") {
    return "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100";
  }
  return "border-black/10 bg-white text-slate-700 hover:bg-slate-50";
}

export function ActionChipLink({ href, label, tone, icon, target }: ActionChipLinkProps) {
  return (
    <Link
      href={href}
      target={target}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98] active:translate-y-px ${getToneClass(tone)}`}
    >
      <Icon kind={icon} />
      <span>{label}</span>
    </Link>
  );
}
