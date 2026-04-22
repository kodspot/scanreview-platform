"use client";

import { useState } from "react";
import { deleteOrganizationAction } from "@/app/actions/superadmin";

interface DeleteOrgFormProps {
  orgPublicId: string;
  orgName: string;
}

export function DeleteOrgForm({ orgPublicId, orgName }: DeleteOrgFormProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 active:scale-[0.98]"
      >
        Archive org
      </button>
    );
  }

  return (
    <form
      action={async (fd) => {
        setPending(true);
        await deleteOrganizationAction(fd);
        setPending(false);
        setOpen(false);
      }}
      className="mt-2 rounded-[14px] border border-red-200 bg-red-50 p-3"
    >
      <input type="hidden" name="orgPublicId" value={orgPublicId} />
      <p className="text-xs font-semibold text-red-700">Archive {orgName}</p>
      <p className="mt-1 text-xs text-red-600">
        Type {orgPublicId} to confirm archive. You can restore later from Archived Organizations.
      </p>
      <input
        name="confirmPublicId"
        required
        placeholder={orgPublicId}
        className="mt-2 w-full rounded-[10px] border border-red-200 bg-white px-3 py-2 text-xs outline-none focus:border-red-400"
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          {pending ? "Archiving..." : "Confirm archive"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-black/10 px-3 py-1.5 text-xs text-slate-700 transition hover:bg-white"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
