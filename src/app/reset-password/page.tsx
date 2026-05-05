import Link from "next/link";
import { performPasswordResetAction } from "@/app/actions/auth";

const errors: Record<string, string> = {
  invalid_token: "This reset link is invalid. Request a new one.",
  expired: "This reset link expired. Request a new one.",
  weak: "Choose a password with at least 8 characters.",
  mismatch: "Passwords did not match.",
  rate_limited: "Too many attempts. Try again in a few minutes.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  if (!token) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#f8fafc_100%)] px-6 py-10 text-slate-950">
        <div className="mx-auto max-w-md rounded-[36px] border border-black/10 bg-white p-8 shadow-[0_30px_100px_rgba(15,23,42,0.14)]">
          <h1 className="text-2xl font-semibold">Missing reset token</h1>
          <p className="mt-3 text-sm text-slate-600">
            Open the link from your password reset request, or{" "}
            <Link className="font-medium text-slate-950 underline" href="/forgot-password">
              request a new one
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.18),_transparent_36%),linear-gradient(180deg,#fff7ed_0%,#f8fafc_100%)] px-6 py-10 text-slate-950">
      <div className="mx-auto max-w-md rounded-[36px] border border-black/10 bg-white p-8 shadow-[0_30px_100px_rgba(15,23,42,0.14)]">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Account recovery</p>
        <h1 className="mt-3 text-3xl font-semibold">Choose a new password</h1>
        <p className="mt-3 text-sm text-slate-600">
          This link can be used once and expires within an hour.
        </p>

        <form action={performPasswordResetAction} className="mt-8 space-y-4">
          <input type="hidden" name="token" value={token} />
          <label htmlFor="reset-password" className="block text-sm text-slate-700">
            <span className="mb-2 block">New password</span>
            <input
              id="reset-password"
              className="w-full rounded-[20px] border border-black/10 px-4 py-3 outline-none transition focus:border-slate-950 focus-visible:ring-2 focus-visible:ring-slate-300"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={200}
              required
            />
          </label>
          <label htmlFor="reset-confirm" className="block text-sm text-slate-700">
            <span className="mb-2 block">Confirm password</span>
            <input
              id="reset-confirm"
              className="w-full rounded-[20px] border border-black/10 px-4 py-3 outline-none transition focus:border-slate-950 focus-visible:ring-2 focus-visible:ring-slate-300"
              name="confirm"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={200}
              required
            />
          </label>

          {error ? (
            <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {errors[error] || "Unable to reset password."}
            </p>
          ) : null}

          <button
            className="w-full rounded-full bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-900 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            type="submit"
          >
            Set new password
          </button>
        </form>
      </div>
    </div>
  );
}
