import type { ReactNode } from "react";
import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/lib/types";

interface AppShellProps {
  title: string;
  eyebrow: string;
  session: SessionUser;
  children: ReactNode;
}

export function AppShell({ title, eyebrow, session, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.18),_transparent_36%),linear-gradient(180deg,#f8fafc_0%,#f3efe4_100%)] text-slate-950">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
        <div>
          <h1 className="text-xl font-bold text-slate-950 leading-tight">{eyebrow}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{title}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right md:block">
            <p className="text-sm font-medium text-slate-950">{session.name}</p>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{session.role.replace("_", " ")}</p>
          </div>
          <nav className="hidden gap-2 md:flex">
            {session.role !== "super_admin" && (
              <Link className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300" href="/dashboard">
                Dashboard
              </Link>
            )}
            {session.role === "super_admin" && (
              <Link className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300" href="/super-admin">
                Control Center
              </Link>
            )}
          </nav>
          <form action={logoutAction}>
            <button
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              type="submit"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-6 pb-12 lg:px-10">{children}</main>
    </div>
  );
}
