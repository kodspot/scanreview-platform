import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { AppShell } from "@/components/shell/app-shell";
import { ActionChipLink } from "@/components/super-admin/action-chip-link";
import { CreateServiceForm } from "@/components/dashboard/create-service-form";
import { ServiceActions } from "@/components/dashboard/service-actions";
import { RatingsDistribution } from "@/components/dashboard/ratings-distribution";
import { ActivityTrend } from "@/components/dashboard/activity-trend";
import { NoticeBanner } from "@/components/ui/notice-banner";
import { requireSession } from "@/lib/auth/guards";
import { getDashboardSnapshot } from "@/lib/services/dashboard-service";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; message?: string }>;
}) {
  const session = await requireSession(["org_admin", "org_manager", "org_analyst"]);
  const snapshot = await getDashboardSnapshot(session.organizationId || "", {});
  const { notice, message } = await searchParams;
  const orgPublicId = snapshot.organization?.publicId;
  const canManageServices = session.role === "org_admin" || session.role === "org_manager";
  const canDeleteServices = session.role === "org_admin";

  const conversionPct = (snapshot.metrics.conversionRate * 100).toFixed(1);
  const maxRating = snapshot.services[0]?.reviewConfig.maxRating ?? 5;

  return (
    <AppShell
      eyebrow={snapshot.organization?.name ?? "Organization workspace"}
      session={session}
      title="Review operations dashboard"
    >
      {notice ? <NoticeBanner tone={notice === "success" ? "success" : "error"} message={message ?? ""} /> : null}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard helper="Across the current tenant scope" label="Average rating" value={snapshot.metrics.averageRating.toFixed(2)} />
        <KpiCard helper="Total captured submissions" label="Reviews" value={snapshot.metrics.reviewCount.toString()} />
        <KpiCard helper="QR scans tracked from public review pages" label="Scans" value={snapshot.metrics.scanCount.toString()} />
        <KpiCard helper="Reviews submitted per scan" label="Conversion" value={`${conversionPct}%`} />
        <KpiCard helper="Triggers follow-up workflows" label="Low-rating alerts" value={snapshot.metrics.lowRatingCount.toString()} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <SectionCard description="Daily scans vs reviews — last 30 days." title="Activity trend">
          <ActivityTrend trend={snapshot.metrics.trend} />
        </SectionCard>
        <SectionCard description="How customer ratings are distributed." title="Ratings distribution">
          <RatingsDistribution distribution={snapshot.metrics.distribution || []} maxRating={maxRating} />
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionCard
          description="Active services for this organization."
          title="Services"
          action={canManageServices ? <CreateServiceForm /> : undefined}
        >
          {snapshot.services.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              No services available yet. {canManageServices ? "Create one above to get started." : "Contact your admin to provision services."}
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
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] border ${
                        service.status === "active"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                    >
                      {service.status}
                    </span>
                  </div>
                  <div className="mt-3 border-t border-black/5 pt-3 text-xs text-slate-500">
                    Service ID: <span className="font-medium text-slate-700">{service.publicId}</span>
                    <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-500 border border-black/5">
                      {service.reviewConfig.ratingType}
                    </span>
                  </div>
                  {orgPublicId ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Open links</p>
                      <div className="flex flex-wrap gap-2">
                        <ActionChipLink
                          href={`/r/${orgPublicId}/${service.publicId}`}
                          icon="external"
                          label="Review page"
                          target="_blank"
                          tone="neutral"
                        />
                      </div>
                      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Download printable QR</p>
                      <div className="flex flex-wrap gap-2">
                        <ActionChipLink
                          href={`/api/super-admin/qr-pdf/${orgPublicId}/${service.publicId}?size=a6`}
                          icon="pdf"
                          label="A6"
                          tone="pdf"
                        />
                        <ActionChipLink
                          href={`/api/super-admin/qr-pdf/${orgPublicId}/${service.publicId}?size=a4`}
                          icon="pdf"
                          label="A4 (4x)"
                          tone="pdf"
                        />
                        <ActionChipLink
                          href={`/api/super-admin/qr-pdf/${orgPublicId}/${service.publicId}?size=a3`}
                          icon="pdf"
                          label="A3 (8x)"
                          tone="pdf"
                        />
                      </div>
                      {canManageServices ? (
                        <div className="mt-3 border-t border-black/5 pt-3">
                          <ServiceActions
                            servicePublicId={service.publicId}
                            serviceName={service.name}
                            serviceCategory={service.category}
                            serviceStatus={service.status}
                            canDelete={canDeleteServices}
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
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
                      <p className="font-semibold text-slate-950">
                        {review.ratingValue.toFixed(1)} / {review.maxRating}
                        {review.serviceName ? <span className="ml-2 text-xs font-normal text-slate-500">· {review.serviceName}</span> : null}
                      </p>
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
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
