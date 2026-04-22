import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { AppShell } from "@/components/shell/app-shell";
import { requireSession } from "@/lib/auth/guards";
import { getDashboardSnapshot } from "@/lib/services/dashboard-service";

export default async function DashboardPage() {
  const session = await requireSession(["org_admin", "org_manager", "org_analyst"]);
  const snapshot = await getDashboardSnapshot(session.organizationId || "", {});

  return (
    <AppShell eyebrow="Organization workspace" session={session} title="Review operations dashboard">
      <div className="grid gap-5 lg:grid-cols-3">
        <KpiCard
          helper="Across the current tenant scope"
          label="Average rating"
          value={snapshot.metrics.averageRating.toFixed(2)}
        />
        <KpiCard
          helper="Total captured submissions"
          label="Reviews"
          value={snapshot.metrics.reviewCount.toString()}
        />
        <KpiCard
          helper="Triggers follow-up workflows"
          label="Low-rating alerts"
          value={snapshot.metrics.lowRatingCount.toString()}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionCard description="Active services and current review configuration surfaces." title="Services">
          <div className="space-y-3">
            {snapshot.services.map((service) => (
              <div key={service.publicId} className="rounded-[22px] border border-black/10 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-950">{service.name}</p>
                    <p className="text-sm text-slate-500">{service.category}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                    {service.reviewConfig.ratingType}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard description="Recent reviews sorted by most recent feedback." title="Recent reviews">
          <div className="space-y-3">
            {snapshot.recentReviews.map((review) => (
              <div key={review.id} className="rounded-[22px] border border-black/10 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-950">{review.ratingValue.toFixed(1)} / 5</p>
                    <p className="text-sm text-slate-500">{review.submittedAt}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                      review.requiresAttention
                        ? "bg-red-50 text-red-700"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {review.sentiment}
                  </span>
                </div>
                {review.answers.length > 0 ? (
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    {review.answers.slice(0, 2).map((answer) => (
                      <p key={answer.questionId}>
                        <span className="font-medium text-slate-900">{answer.label}: </span>
                        {String(answer.value)}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
