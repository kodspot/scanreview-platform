import Link from "next/link";
import { AppShell } from "@/components/shell/app-shell";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { NoticeBanner } from "@/components/ui/notice-banner";
import { CreateOrgForm } from "@/components/super-admin/create-org-form";
import { RestoreOrgForm } from "@/components/super-admin/restore-org-form";
import { PurgeOrgForm } from "@/components/super-admin/purge-org-form";
import { OrganizationCard } from "@/components/super-admin/organization-card";
import { OrgFilterBar } from "@/components/super-admin/org-filter-bar";
import { requireSession } from "@/lib/auth/guards";
import { getSuperAdminSnapshot } from "@/lib/services/dashboard-service";

export const dynamic = "force-dynamic";

const STATUS_VALUES = new Set(["active", "trial", "suspended"]);

export default async function SuperAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; message?: string; q?: string; status?: string; page?: string }>;
}) {
  const session = await requireSession(["super_admin"]);
  const sp = await searchParams;
  const search = (sp.q || "").trim();
  const status = (STATUS_VALUES.has(sp.status || "") ? sp.status : "all") as
    | "all"
    | "active"
    | "trial"
    | "suspended";
  const page = Math.max(1, Number.parseInt(sp.page || "1", 10) || 1);

  const snapshot = await getSuperAdminSnapshot({ search, status, page, pageSize: 25 });
  const { notice, message } = sp;

  function pageUrl(p: number) {
    const q = new URLSearchParams();
    if (search) q.set("q", search);
    if (status && status !== "all") q.set("status", status);
    if (p > 1) q.set("page", String(p));
    return `/super-admin${q.toString() ? `?${q.toString()}` : ""}`;
  }

  const totalReviews = snapshot.organizations.reduce((s, r) => s + r.organization.usage.reviewCount, 0);
  const totalScans = snapshot.scanCount;
  const conversionPct = totalScans > 0 ? Math.min(100, (totalReviews / totalScans) * 100) : 0;

  return (
    <AppShell eyebrow="Platform operations" session={session} title="Super admin control center">
      {notice ? <NoticeBanner tone={notice === "success" ? "success" : "error"} message={message ?? ""} /> : null}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard helper="Provisioned tenants" label="Organizations" value={snapshot.organizationCount.toString()} />
        <KpiCard helper="All-time captured feedback" label="Reviews" value={totalReviews.toString()} />
        <KpiCard helper="Tenant service inventory" label="Services" value={snapshot.serviceCount.toString()} />
        <KpiCard
          helper={`${totalScans} scans · ${conversionPct.toFixed(1)}% conversion`}
          label="Engagement"
          value={totalScans.toString()}
        />
      </div>

      {snapshot.archivedOrganizations.length > 0 ? (
        <div className="mt-6">
          <SectionCard
            description="Soft-deleted tenants. Restore safely, or permanently purge when required."
            title={`Archived (${snapshot.archivedOrganizations.length})`}
          >
            <div className="space-y-3">
              {snapshot.archivedOrganizations.map((organization) => (
                <div key={`archived-${organization.publicId}`} className="rounded-[16px] border border-black/10 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{organization.name}</p>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{organization.publicId}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Archived by {organization.archive?.byName || "Unknown"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-start gap-2">
                      <RestoreOrgForm orgPublicId={organization.publicId} />
                      <PurgeOrgForm orgName={organization.name} orgPublicId={organization.publicId} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      ) : null}

      <div className="mt-6">
        <SectionCard
          description="Provision tenants and manage everything per-organization: admins, services, QR posters, settings, and lifecycle."
          title="Organizations"
          action={<CreateOrgForm />}
        >
          <div className="space-y-4">
            <OrgFilterBar initialSearch={search} initialStatus={status} total={snapshot.pagination.total} />

            {snapshot.organizations.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-black/10 bg-slate-50 py-10 text-center text-sm text-slate-500">
                {search || status !== "all"
                  ? "No organizations match these filters."
                  : "No organizations yet. Create one above to get started."}
              </div>
            ) : (
              <div className="space-y-3">
                {snapshot.organizations.map((row) => (
                  <OrganizationCard
                    key={row.organization.publicId}
                    organization={{
                      publicId: row.organization.publicId,
                      name: row.organization.name,
                      industry: row.organization.industry,
                      status: row.organization.status,
                      reviewCount: row.organization.usage.reviewCount,
                      serviceCount: row.services.length,
                      scanCount: row.scanCount,
                      conversionRate:
                        row.scanCount > 0
                          ? Math.min(1, row.organization.usage.reviewCount / row.scanCount)
                          : 0,
                      createdAt: row.organization.createdAt
                        ? new Date(row.organization.createdAt).toISOString()
                        : undefined,
                    }}
                    admins={row.admins}
                    services={row.services}
                  />
                ))}
              </div>
            )}

            {snapshot.pagination.totalPages > 1 ? (
              <div className="flex items-center justify-between rounded-[16px] border border-black/5 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                <span>
                  Page <span className="font-semibold text-slate-900">{snapshot.pagination.page}</span> of{" "}
                  <span className="font-semibold text-slate-900">{snapshot.pagination.totalPages}</span> ·{" "}
                  {snapshot.pagination.total} total
                </span>
                <div className="flex items-center gap-2">
                  {page > 1 ? (
                    <Link
                      className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium hover:bg-slate-100"
                      href={pageUrl(page - 1)}
                    >
                      ← Prev
                    </Link>
                  ) : (
                    <span className="rounded-full border border-black/5 bg-white/60 px-3 py-1 text-xs text-slate-300">← Prev</span>
                  )}
                  {page < snapshot.pagination.totalPages ? (
                    <Link
                      className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium hover:bg-slate-100"
                      href={pageUrl(page + 1)}
                    >
                      Next →
                    </Link>
                  ) : (
                    <span className="rounded-full border border-black/5 bg-white/60 px-3 py-1 text-xs text-slate-300">Next →</span>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard
          description="Recent platform operations for security, compliance, and audit readiness."
          title="Audit Trail"
        >
          {snapshot.recentAuditLogs.length === 0 ? (
            <p className="text-sm text-slate-500">No audit events captured yet.</p>
          ) : (
            <div className="space-y-2">
              {snapshot.recentAuditLogs.map((log) => (
                <div
                  key={log._id?.toString() || `${log.action}-${log.createdAt}`}
                  className="rounded-[12px] border border-black/10 bg-slate-50 px-3 py-2"
                >
                  <p className="text-sm font-medium text-slate-900">{log.summary}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {log.actor.name} ({log.actor.email}) · {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
