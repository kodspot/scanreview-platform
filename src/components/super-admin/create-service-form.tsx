"use client";

import { useState } from "react";
import { createServiceForOrgAction } from "@/app/actions/superadmin";

interface CreateServiceForOrgFormProps {
  orgPublicId: string;
  orgName: string;
}

export function CreateServiceForOrgForm({ orgPublicId, orgName }: CreateServiceForOrgFormProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="rounded-full border border-black/10 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] active:translate-y-px"
        >
          + Add Service
        </button>
      ) : (
        <div className="mt-3 rounded-[18px] border border-black/10 bg-white p-4">
          <p className="mb-1 text-xs uppercase tracking-[0.2em] text-slate-400">New service for</p>
          <p className="mb-4 text-sm font-semibold text-slate-950">{orgName}</p>
          <form
            action={async (fd) => {
              setPending(true);
              await createServiceForOrgAction(fd);
              setOpen(false);
              setPending(false);
            }}
            className="space-y-3"
          >
            <input type="hidden" name="orgPublicId" value={orgPublicId} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Service name</label>
                <input
                  name="name"
                  required
                  autoFocus
                  placeholder="Airport Express Ride"
                  className="w-full rounded-[12px] border border-black/10 px-3 py-2 text-sm outline-none transition focus:border-slate-950"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Category</label>
                <input
                  name="category"
                  required
                  placeholder="Airport Transfer"
                  className="w-full rounded-[12px] border border-black/10 px-3 py-2 text-sm outline-none transition focus:border-slate-950"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Rating type</label>
              <select
                name="ratingType"
                className="w-full rounded-[12px] border border-black/10 px-3 py-2 text-sm outline-none transition focus:border-slate-950"
              >
                <option value="stars">Stars (1-5)</option>
                <option value="emoji">Emoji</option>
                <option value="numeric">Numeric (1-10)</option>
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={pending}
                className="rounded-full bg-slate-950 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98] active:translate-y-px disabled:opacity-60"
              >
                {pending ? "Creating..." : "Create Service"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-black/10 px-4 py-1.5 text-xs text-slate-600 transition hover:bg-slate-100 active:scale-[0.98] active:translate-y-px"
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
