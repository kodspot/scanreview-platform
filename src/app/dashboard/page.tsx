import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { AppShell } from "@/components/shell/app-shell";
import { requireSession } from "@/lib/auth/guards";
import { getDashboardSnapshot } from "@/lib/services/dashboard-service";

export default async function DashboardPage() {
  const session = await requireSession(["org_admin", "org_manager", "org_analyst"]);
  const snapshot = await getDashboardSnapshot(session.organizationId || "", {});

  return (
    <AppShell
      eyebrow={snapshot.organization?.name ?? "Organization workspace"}
      session={session}
      title="Review operations dashboard"
    >
      <div className="grid gap-5 lg:grid-cols-3">
        <KpiCard helper="Across the current tenant scope" label="Average rating" value={snapshot.metrics.averageRating.toFixed(2)} />
        <KpiCard helper="Total captured submissions" label="Reviews" value={snapshot.metrics.reviewCount.toString()} />
        <KpiCard helper="Triggers follow-up workflows" label="Low-rating alerts" value={snapshot.metrics.lowRatingCount.toString()} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionCard description="Active services for this organization." title="Services">
          {snapshot.services.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              No services available yet. Contact superadmin to provision services and QR print assets.
            </div>
          ) : (
            <div className="space-y-3">
              {snapshot.services.map((service) => (
                <div key={service.publicId} className="rounded-[22px] border border-black/10 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-950">{service.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{service.category}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-500 border border-black/5">
                      {service.reviewConfig.ratingType}
                    </span>
                  </div>
                  <div className="mt-3 border-t border-black/5 pt-3 text-xs text-slate-500">
                    Service ID: <span className="font-medium text-slate-700">{service.publicId}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard description="Recent reviews sorted by most recent feedback." title="Recent reviews">
          {snapshot.recentReviews.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">No reviews yet. Share the review link to start collecting feedback.</div>
          ) : (
            <div className="space-y-3">
              {snapshot.recentReviews.map((review) => (
                <div key={review.id} className="rounded-[22px] border border-black/10 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-950">{review.ratingValue.toFixed(1)} / 5</p>
                      <p className="text-xs text-slate-500 mt-0.5">{review.submittedAt}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.15em] ${review.requiresAttention ? "bg-red-50 text-red-700" : review.sentiment === "positive" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {review.sentiment}
                    </span>
                  </div>
                  {review.answers.length > 0 ? (
                    <div className="mt-3 space-y-1.5 text-sm text-slate-600 border-t border-black/5 pt-3">
                      {review.answers.slice(0, 2).map((answer) => (
                        <p key={answer.questionId}>
                          <span className="font-medium text-slate-900">{answer.label}: </span>
                          {String(answer.value)}
                        </p>
                      ))}
                    </div>
                  ) : null}
                  {review.reviewer?.name || review.reviewer?.email || review.reviewer?.phone ? (
                    <div className="mt-3 rounded-[14px] border border-black/10 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <p className="font-medium uppercase tracking-[0.12em] text-slate-500">Reviewer details</p>
                      {review.reviewer?.name ? <p className="mt-1">Name: {review.reviewer.name}</p> : null}
                      {review.reviewer?.email ? <p>Email: {review.reviewer.email}</p> : null}
                      {review.reviewer?.phone ? <p>Phone: {review.reviewer.phone}</p> : null}
                    </div>
                  ) : null}
                  <div className="mt-3 border-t border-black/5 pt-3 text-xs text-slate-500">
                    Captured {review.submittedAt}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
