import { adminKeyLoginAction } from "@/app/actions/auth";

const errors: Record<string, string> = {
  invalid_input: "Enter a valid admin key.",
  invalid_credentials: "Admin key did not match.",
};

export default async function PlatformProvisionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.2),_transparent_34%),linear-gradient(180deg,#fff7ed_0%,#f8fafc_100%)] px-6 py-10 text-slate-950">
      <div className="mx-auto max-w-md rounded-[36px] border border-black/10 bg-white p-8 shadow-[0_30px_100px_rgba(15,23,42,0.14)]">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Provisioning access</p>
        <h1 className="mt-3 text-3xl font-semibold">Superadmin key sign in</h1>
        <p className="mt-3 text-sm text-slate-600">Enter your platform admin key to open provisioning controls.</p>

        <form action={adminKeyLoginAction} className="mt-8 space-y-4">
          <label className="block text-sm text-slate-700">
            <span className="mb-2 block">Admin Key</span>
            <input
              className="w-full rounded-[20px] border border-black/10 px-4 py-3 outline-none transition focus:border-slate-950 focus-visible:ring-2 focus-visible:ring-slate-300"
              name="admin_key"
              type="password"
              placeholder="Enter your admin key"
              autoFocus
            />
          </label>

          {error ? (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{errors[error] || "Unable to sign in."}</p>
          ) : null}

          <button
            className="w-full rounded-full bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-900 active:scale-[0.98] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            type="submit"
          >
            Access Superadmin
          </button>
        </form>
      </div>
    </div>
  );
}
