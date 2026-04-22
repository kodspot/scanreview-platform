import Link from "next/link";
import { InstallPwaButton } from "@/components/pwa/install-button";

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.2),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(234,88,12,0.16),_transparent_32%),linear-gradient(180deg,#fff7ed_0%,#f8fafc_52%,#f3efe4_100%)] px-6 py-8 text-slate-950">
      <main className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-6 rounded-[36px] border border-black/10 bg-white/75 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.1)] backdrop-blur lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Kodspot ScanReview</p>
            <h1 className="mt-4 text-5xl font-semibold leading-tight lg:text-6xl">
              QR-powered review intelligence for multi-location service brands.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Built as a config-driven SaaS platform for transport, hospitality, healthcare, and any service organization that needs tenant-isolated review collection, analytics, and branded QR assets.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link className="rounded-full bg-slate-950 px-6 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400" href="/login">
              Admin Login
            </Link>
            <Link className="rounded-full border border-black/10 bg-white px-6 py-4 text-sm font-semibold transition hover:bg-slate-50 active:scale-[0.98] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300" href="/r/org_demo001/svc_airport-express">
              Open Demo Review Flow
            </Link>
            <InstallPwaButton />
          </div>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[32px] bg-slate-950 p-8 text-white shadow-[0_30px_100px_rgba(15,23,42,0.16)]">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Architecture</p>
            <div className="mt-5 space-y-4 text-sm leading-7 text-white/78">
              <p>Next.js App Router handles the frontend, server-side dashboards, route handlers, and print-ready QR rendering in a single Vercel deployment.</p>
              <p>MongoDB Atlas stores tenant-scoped organizations, users, services, QR assets, and reviews with compound indexes optimized for analytics and timeline queries.</p>
              <p>The review engine is config-driven, so each service can switch between stars, emoji, or numeric scoring and attach conditional low-rating questions without code changes.</p>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">1000+ organizations</div>
              <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">1M+ reviews target</div>
              <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">Free-tier aware Vercel design</div>
            </div>
          </article>

          <article className="rounded-[32px] border border-black/10 bg-white p-8 shadow-[0_30px_100px_rgba(15,23,42,0.1)]">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Core flows</p>
            <ol className="mt-5 space-y-4 text-sm leading-7 text-slate-700">
              <li>1. Platform operations team provisions organizations and controls feature flags.</li>
              <li>2. Organization admins monitor service performance and review timelines.</li>
              <li>3. Customers scan QR, submit feedback without login, and finish in under 10 seconds.</li>
              <li>4. Dashboards surface trends, average rating, recent reviews, and low-rating alerts.</li>
            </ol>
            <div className="mt-8 rounded-[24px] bg-amber-50 p-5 text-sm leading-7 text-amber-950">
              Printable A6 poster route: /qr/org_demo001/svc_airport-express/a6
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}

