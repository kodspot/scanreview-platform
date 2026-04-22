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
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-slate-500">{eyebrow}</p>
          <h1 className="mt-2 text-2xl font-semibold">{title}</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium">{session.name}</p>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{session.role}</p>
          </div>
          <nav className="hidden gap-3 md:flex">
            <Link className="rounded-full border border-black/10 px-4 py-2 text-sm" href="/dashboard">
              Dashboard
            </Link>
            <Link className="rounded-full border border-black/10 px-4 py-2 text-sm" href="/super-admin">
              Super Admin
            </Link>
          </nav>
          <form action={logoutAction}>
            <button
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white"
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
