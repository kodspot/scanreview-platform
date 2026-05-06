import { SectionCard } from "@/components/ui/section-card";

type Outcome =
  | "success"
  | "validation_failed"
  | "missing_required"
  | "rate_limited"
  | "service_not_found"
  | "invalid_json"
  | "error";

interface SubmissionStats {
  success: number;
  validation_failed: number;
  missing_required: number;
  rate_limited: number;
  service_not_found: number;
  invalid_json: number;
  error: number;
  total: number;
}

interface Attempt {
  id: string;
  attemptedAt: string;
  attemptedAtRelative: string;
  outcome: Outcome;
  reason?: string;
  ratingValue?: number;
  serviceName?: string;
}

interface Props {
  stats24h: SubmissionStats;
  recentAttempts: Attempt[];
}

const OUTCOME_LABEL: Record<Outcome, string> = {
  success: "Saved",
  validation_failed: "Invalid data",
  missing_required: "Missing required answer",
  rate_limited: "Rate limited",
  service_not_found: "Service not found",
  invalid_json: "Bad request body",
  error: "Server error",
};

const OUTCOME_TONE: Record<Outcome, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  validation_failed: "bg-amber-50 text-amber-700 ring-amber-200",
  missing_required: "bg-amber-50 text-amber-700 ring-amber-200",
  rate_limited: "bg-amber-50 text-amber-700 ring-amber-200",
  service_not_found: "bg-rose-50 text-rose-700 ring-rose-200",
  invalid_json: "bg-rose-50 text-rose-700 ring-rose-200",
  error: "bg-rose-50 text-rose-700 ring-rose-200",
};

export function SubmissionDiagnostics({ stats24h, recentAttempts }: Props) {
  const failed = stats24h.total - stats24h.success;
  const failureRate =
    stats24h.total > 0 ? Math.round((failed / stats24h.total) * 100) : 0;

  return (
    <SectionCard
      title="Submission diagnostics"
      description="Every tap on Submit — successful or not — from the last 24 hours. Use this to confirm reviews are reaching the server and why any were rejected."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Attempts (24h)</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{stats24h.total}</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-700">Saved</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700">{stats24h.success}</p>
        </div>
        <div className="rounded-2xl bg-rose-50 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-rose-700">Rejected</p>
          <p className="mt-1 text-2xl font-semibold text-rose-700">{failed}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Rejection rate</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{failureRate}%</p>
        </div>
      </div>

      {failed > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {stats24h.missing_required > 0 ? (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700 ring-1 ring-amber-200">
              {stats24h.missing_required} missing required answer
            </span>
          ) : null}
          {stats24h.validation_failed > 0 ? (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700 ring-1 ring-amber-200">
              {stats24h.validation_failed} validation failed
            </span>
          ) : null}
          {stats24h.rate_limited > 0 ? (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700 ring-1 ring-amber-200">
              {stats24h.rate_limited} rate limited
            </span>
          ) : null}
          {stats24h.service_not_found > 0 ? (
            <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700 ring-1 ring-rose-200">
              {stats24h.service_not_found} service not found
            </span>
          ) : null}
          {stats24h.error > 0 ? (
            <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700 ring-1 ring-rose-200">
              {stats24h.error} server errors
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5">
        <p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-500">Recent attempts</p>
        {recentAttempts.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-black/10 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
            No submission attempts recorded yet. Once a customer taps Submit on the review form — successful or not — it will appear here.
          </div>
        ) : (
          <ul className="divide-y divide-black/5">
            {recentAttempts.map((attempt) => (
              <li key={attempt.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${OUTCOME_TONE[attempt.outcome]}`}
                    >
                      {OUTCOME_LABEL[attempt.outcome]}
                    </span>
                    {attempt.serviceName ? (
                      <span className="text-sm font-medium text-slate-900">{attempt.serviceName}</span>
                    ) : null}
                    {typeof attempt.ratingValue === "number" ? (
                      <span className="text-xs text-slate-500">rating {attempt.ratingValue}</span>
                    ) : null}
                  </div>
                  {attempt.reason && attempt.outcome !== "success" ? (
                    <p className="mt-1 text-xs text-slate-600">{attempt.reason}</p>
                  ) : null}
                </div>
                <span className="shrink-0 text-xs text-slate-400" title={attempt.attemptedAt}>
                  {attempt.attemptedAtRelative}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SectionCard>
  );
}
