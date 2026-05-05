import Link from "next/link";
import { requestPasswordResetAction } from "@/app/actions/auth";

const errors: Record<string, string> = {
  invalid_input: "Enter a valid email address.",
  rate_limited: "Too many attempts. Try again in a few minutes.",
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { error, notice } = await searchParams;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.18),_transparent_36%),linear-gradient(180deg,#fff7ed_0%,#f8fafc_100%)] px-6 py-10 text-slate-950">
      <div className="mx-auto max-w-md rounded-[36px] border border-black/10 bg-white p-8 shadow-[0_30px_100px_rgba(15,23,42,0.14)]">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Account recovery</p>
        <h1 className="mt-3 text-3xl font-semibold">Reset your password</h1>
        <p className="mt-3 text-sm text-slate-600">
          Enter your account email. If we find a matching active account, we&apos;ll create a one-time reset link.
        </p>

        <form action={requestPasswordResetAction} className="mt-8 space-y-4">
          <label htmlFor="forgot-email" className="block text-sm text-slate-700">
            <span className="mb-2 block">Email</span>
            <input
              id="forgot-email"
              className="w-full rounded-[20px] border border-black/10 px-4 py-3 outline-none transition focus:border-slate-950 focus-visible:ring-2 focus-visible:ring-slate-300"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={200}
            />
          </label>

          {error ? (
            <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {errors[error] || "Unable to process request."}
            </p>
          ) : null}

          {notice === "sent" ? (
            <p role="status" className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              If that email matches an active account, a one-time reset link has been generated. Check your inbox or contact your platform administrator if you don&apos;t receive it.
            </p>
          ) : null}

          <button
            className="w-full rounded-full bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-900 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            type="submit"
          >
            Send reset link
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-500">
          Remembered it?{" "}
          <Link className="font-medium text-slate-950 hover:text-slate-700" href="/login">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
