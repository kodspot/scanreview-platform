"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "trial", label: "Trial" },
  { value: "suspended", label: "Suspended" },
];

export function OrgFilterBar({
  initialSearch,
  initialStatus,
  total,
}: {
  initialSearch: string;
  initialStatus: string;
  total: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [pending, startTransition] = useTransition();

  function update(next: Record<string, string | undefined>) {
    const sp = new URLSearchParams(params?.toString() || "");
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    sp.delete("page"); // reset paging when filters change
    startTransition(() => {
      router.push(`/super-admin?${sp.toString()}`);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[20px] border border-black/10 bg-white p-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: search });
        }}
        className="flex flex-1 min-w-[220px] items-center gap-2"
      >
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, ID, slug, or industry…"
          className="flex-1 rounded-full border border-black/10 bg-slate-50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          Search
        </button>
        {initialSearch ? (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              update({ q: undefined });
            }}
            className="rounded-full border border-black/10 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
          >
            Clear
          </button>
        ) : null}
      </form>
      <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => update({ status: opt.value === "all" ? undefined : opt.value })}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              initialStatus === opt.value || (opt.value === "all" && !initialStatus)
                ? "bg-slate-950 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        <span className="font-semibold text-slate-900">{total}</span> match{total === 1 ? "" : "es"}
      </p>
    </div>
  );
}
