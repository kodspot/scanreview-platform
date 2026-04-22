"use client";

import { useState } from "react";
import { resetOrgAdminPasswordAction } from "@/app/actions/superadmin";

interface ResetAdminPasswordFormProps {
  orgPublicId: string;
  adminEmail: string;
  adminName: string;
}

export function ResetAdminPasswordForm({
  orgPublicId,
  adminEmail,
  adminName,
}: ResetAdminPasswordFormProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
      >
        Reset password
      </button>
    );
  }

  return (
    <form
      action={async (fd) => {
        setPending(true);
        await resetOrgAdminPasswordAction(fd);
        setPending(false);
        setOpen(false);
      }}
      className="mt-2 flex flex-wrap items-center gap-2 rounded-[14px] border border-black/10 bg-white p-2"
    >
      <input type="hidden" name="orgPublicId" value={orgPublicId} />
      <input type="hidden" name="email" value={adminEmail} />
      <input
        name="password"
        type="password"
        minLength={8}
        required
        autoFocus
        placeholder={`New password for ${adminName}`}
        className="min-w-[220px] flex-1 rounded-[10px] border border-black/10 px-3 py-1.5 text-xs outline-none focus:border-slate-900"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-full border border-black/10 px-3 py-1.5 text-xs text-slate-600 transition hover:bg-slate-100"
      >
        Cancel
      </button>
    </form>
  );
}
