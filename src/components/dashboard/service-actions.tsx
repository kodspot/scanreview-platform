"use client";

import { useState, useTransition } from "react";
import { deleteServiceAction, toggleServiceStatusAction, updateServiceAction } from "@/app/actions/services";

interface ServiceActionsProps {
  servicePublicId: string;
  serviceName: string;
  serviceCategory: string;
  serviceStatus: "active" | "paused";
  canDelete: boolean;
}

export function ServiceActions({
  servicePublicId,
  serviceName,
  serviceCategory,
  serviceStatus,
  canDelete,
}: ServiceActionsProps) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        action={(fd) => startTransition(() => toggleServiceStatusAction(fd))}
      >
        <input type="hidden" name="servicePublicId" value={servicePublicId} />
        <button
          type="submit"
          disabled={pending}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition disabled:opacity-50 ${
            serviceStatus === "active"
              ? "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
              : "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
          }`}
        >
          {serviceStatus === "active" ? "Pause" : "Activate"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setEditing((v) => !v)}
        className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 hover:bg-slate-50"
      >
        {editing ? "Cancel" : "Edit"}
      </button>

      {canDelete ? (
        <button
          type="button"
          onClick={() => setDeleting((v) => !v)}
          className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-red-700 hover:bg-red-100"
        >
          {deleting ? "Cancel delete" : "Delete"}
        </button>
      ) : null}

      {editing ? (
        <form
          action={(fd) =>
            startTransition(() => {
              updateServiceAction(fd);
              setEditing(false);
            })
          }
          className="mt-3 w-full grid gap-2 rounded-[16px] border border-black/10 bg-white p-3 sm:grid-cols-2"
        >
          <input type="hidden" name="servicePublicId" value={servicePublicId} />
          <label className="text-xs text-slate-600">
            <span className="mb-1 block">Name</span>
            <input
              name="name"
              defaultValue={serviceName}
              className="w-full rounded-[12px] border border-black/10 px-3 py-2 text-sm outline-none focus:border-slate-900"
              required
              maxLength={120}
            />
          </label>
          <label className="text-xs text-slate-600">
            <span className="mb-1 block">Category</span>
            <input
              name="category"
              defaultValue={serviceCategory}
              className="w-full rounded-[12px] border border-black/10 px-3 py-2 text-sm outline-none focus:border-slate-900"
              required
              maxLength={120}
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="sm:col-span-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-50"
          >
            Save changes
          </button>
        </form>
      ) : null}

      {deleting && canDelete ? (
        <form
          action={(fd) => startTransition(() => deleteServiceAction(fd))}
          className="mt-3 w-full space-y-2 rounded-[16px] border border-red-200 bg-red-50/50 p-3"
        >
          <input type="hidden" name="servicePublicId" value={servicePublicId} />
          <p className="text-xs text-red-800">
            Type <code className="rounded bg-white px-1 font-mono">{servicePublicId}</code> to confirm permanent deletion. Reviews and scans for this service will be retained for analytics, but the QR code will stop working.
          </p>
          <input
            name="confirmPublicId"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full rounded-[12px] border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-500"
            placeholder={servicePublicId}
            required
          />
          <button
            type="submit"
            disabled={pending || confirmText !== servicePublicId}
            className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-red-700 disabled:opacity-40"
          >
            Permanently delete
          </button>
        </form>
      ) : null}
    </div>
  );
}
