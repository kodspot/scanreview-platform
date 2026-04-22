"use client";

import { useState } from "react";
import { createOrganizationAction } from "@/app/actions/superadmin";

const INDUSTRIES = [
  "Transport", "Hospitality", "Healthcare", "Retail",
  "Food & Beverage", "Education", "Financial Services", "Real Estate",
  "Logistics", "Other",
];

export function CreateOrgForm() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          + New Organization
        </button>
      ) : (
        <div className="rounded-[24px] border border-black/10 bg-slate-50 p-6">
          <h3 className="font-semibold text-slate-950 mb-4">Create Organization</h3>
          <form
            action={async (fd) => {
              setPending(true);
              await createOrganizationAction(fd);
              setOpen(false);
              setPending(false);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Organization name
              </label>
              <input
                name="name"
                required
                autoFocus
                placeholder="e.g. Acme Taxi Services"
                className="w-full rounded-[16px] border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-slate-950 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Industry
              </label>
              <select
                name="industry"
                required
                className="w-full rounded-[16px] border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-slate-950 transition-colors"
              >
                <option value="">Select industry…</option>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={pending}
                className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98] active:translate-y-px disabled:opacity-60"
              >
                {pending ? "Creating…" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-black/10 px-5 py-2.5 text-sm text-slate-600 transition hover:bg-slate-100 active:scale-[0.98] active:translate-y-px"
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
