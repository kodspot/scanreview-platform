import Link from "next/link";
import { loginAction } from "@/app/actions/auth";

const errors: Record<string, string> = {
  invalid_input: "Enter a valid email and password.",
  invalid_credentials: "Credentials did not match an active account.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.22),_transparent_36%),linear-gradient(180deg,#fff7ed_0%,#f8fafc_100%)] px-6 py-10 text-slate-950">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <section className="space-y-6">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Kodspot ScanReview</p>
          <h1 className="max-w-2xl text-5xl font-semibold leading-tight">
            Multi-tenant QR review operations built for high-volume service businesses.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-slate-600">
            One platform for transport, hospitality, clinics, and any service workflow that needs configurable review capture, tenant analytics, and printable QR assets.
          </p>
          <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
            <div className="rounded-[24px] border border-black/10 bg-white/70 p-4">Config-driven rating models</div>
            <div className="rounded-[24px] border border-black/10 bg-white/70 p-4">A6 print-ready QR posters</div>
            <div className="rounded-[24px] border border-black/10 bg-white/70 p-4">Tenant-safe analytics and alerts</div>
          </div>
        </section>

        <section className="rounded-[36px] border border-black/10 bg-white p-8 shadow-[0_30px_100px_rgba(15,23,42,0.14)]">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Admin sign in</p>
          <h2 className="mt-3 text-3xl font-semibold">Access your workspace</h2>
          <p className="mt-3 text-sm text-slate-600">Use seeded credentials after running the seed script.</p>

          <form action={loginAction} className="mt-8 space-y-4">
            <label className="block text-sm text-slate-700">
              <span className="mb-2 block">Email</span>
              <input
                className="w-full rounded-[20px] border border-black/10 px-4 py-3 outline-none"
                defaultValue="admin@kodspot-demo.com"
                name="email"
                type="email"
              />
            </label>
            <label className="block text-sm text-slate-700">
              <span className="mb-2 block">Password</span>
              <input
                className="w-full rounded-[20px] border border-black/10 px-4 py-3 outline-none"
                defaultValue="ChangeMe123!"
                name="password"
                type="password"
              />
            </label>

            {error ? (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{errors[error] || "Unable to sign in."}</p>
            ) : null}

            <button className="w-full rounded-full bg-slate-950 px-5 py-4 text-sm font-semibold text-white" type="submit">
              Sign in
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-500">
            Public review route example: <Link className="font-medium text-slate-950" href="/r/org_demo001/svc_airport-express">/r/org_demo001/svc_airport-express</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
