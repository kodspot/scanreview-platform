"use client";

import { useState } from "react";
import { restoreOrganizationAction } from "@/app/actions/superadmin";

interface RestoreOrgFormProps {
  orgPublicId: string;
}

export function RestoreOrgForm({ orgPublicId }: RestoreOrgFormProps) {
  const [pending, setPending] = useState(false);

  return (
    <form
      action={async (fd) => {
        setPending(true);
        await restoreOrganizationAction(fd);
        setPending(false);
      }}
    >
      <input type="hidden" name="orgPublicId" value={orgPublicId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "Restoring..." : "Restore"}
      </button>
    </form>
  );
}
