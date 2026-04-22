"use client";

import { useState } from "react";
import { createOrgAdminAction } from "@/app/actions/superadmin";

interface CreateAdminFormProps {
  orgPublicId: string;
  orgName: string;
}

export function CreateAdminForm({ orgPublicId, orgName }: CreateAdminFormProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="rounded-full border border-black/10 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          + Add Admin
        </button>
      ) : (
        <div className="mt-3 rounded-[18px] border border-black/10 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-1">New admin for</p>
          <p className="text-sm font-semibold text-slate-950 mb-4">{orgName}</p>
          <form
            action={async (fd) => {
              setPending(true);
              await createOrgAdminAction(fd);
              setOpen(false);
              setPending(false);
            }}
            className="space-y-3"
          >
            <input type="hidden" name="orgPublicId" value={orgPublicId} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Full name</label>
                <input
                  name="name"
                  required
                  autoFocus
                  placeholder="Jane Smith"
                  className="w-full rounded-[12px] border border-black/10 px-3 py-2 text-sm outline-none focus:border-slate-950 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="admin@company.com"
                  className="w-full rounded-[12px] border border-black/10 px-3 py-2 text-sm outline-none focus:border-slate-950 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="Min. 8 characters"
                className="w-full rounded-[12px] border border-black/10 px-3 py-2 text-sm outline-none focus:border-slate-950 transition-colors"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={pending}
                className="rounded-full bg-slate-950 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60 transition-colors"
              >
                {pending ? "Creating…" : "Create admin"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-black/10 px-4 py-1.5 text-xs text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
