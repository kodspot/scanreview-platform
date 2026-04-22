"use client";

import { useState } from "react";
import { createServiceAction } from "@/app/actions/services";

export function CreateServiceForm() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
        >
          + New Service
        </button>
      ) : (
        <div className="mb-5 rounded-[22px] border border-black/10 bg-slate-50 p-5">
          <h3 className="font-semibold text-slate-950 mb-1 text-sm">Create Service</h3>
          <p className="text-xs text-slate-500 mb-4">A QR code is automatically generated when you create a service.</p>
          <form
            action={async (fd) => {
              setPending(true);
              await createServiceAction(fd);
              setOpen(false);
              setPending(false);
            }}
            className="space-y-3"
          >
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Service name</label>
              <input
                name="name"
                required
                autoFocus
                placeholder="e.g. Airport Express Ride"
                className="w-full rounded-[14px] border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-950 transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                <input
                  name="category"
                  required
                  placeholder="e.g. Airport Transfer"
                  className="w-full rounded-[14px] border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-950 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Rating type</label>
                <select
                  name="ratingType"
                  className="w-full rounded-[14px] border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-950 transition-colors"
                >
                  <option value="stars">⭐ Stars (1–5)</option>
                  <option value="emoji">😊 Emoji</option>
                  <option value="numeric">🔢 Numeric (1–10)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={pending}
                className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 transition-colors"
              >
                {pending ? "Creating…" : "Create & generate QR"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-black/10 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 transition-colors"
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
