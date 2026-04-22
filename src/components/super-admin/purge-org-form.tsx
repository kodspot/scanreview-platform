"use client";

import { useState } from "react";
import { purgeArchivedOrganizationAction } from "@/app/actions/superadmin";

interface PurgeOrgFormProps {
  orgPublicId: string;
  orgName: string;
}

export function PurgeOrgForm({ orgPublicId, orgName }: PurgeOrgFormProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 active:scale-[0.98]"
      >
        Purge permanently
      </button>
    );
  }

  return (
    <form
      action={async (fd) => {
        setPending(true);
        await purgeArchivedOrganizationAction(fd);
        setPending(false);
        setOpen(false);
      }}
      className="rounded-[12px] border border-red-200 bg-red-50 p-2"
    >
      <input type="hidden" name="orgPublicId" value={orgPublicId} />
      <p className="text-[11px] font-semibold text-red-700">Purge {orgName}</p>
      <p className="mt-0.5 text-[11px] text-red-600">Type {orgPublicId} to permanently delete all tenant data.</p>
      <input
        required
        name="confirmPublicId"
        placeholder={orgPublicId}
        className="mt-1 w-full rounded-[8px] border border-red-200 px-2 py-1 text-[11px] outline-none focus:border-red-400"
      />
      <div className="mt-1 flex gap-1.5">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          {pending ? "Purging..." : "Confirm"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-black/10 px-2.5 py-1 text-[11px] text-slate-700 transition hover:bg-white"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
