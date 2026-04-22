import Link from "next/link";
import { AppShell } from "@/components/shell/app-shell";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { CreateOrgForm } from "@/components/super-admin/create-org-form";
import { CreateAdminForm } from "@/components/super-admin/create-admin-form";
import { CreateServiceForOrgForm } from "@/components/super-admin/create-service-form";
import { ResetAdminPasswordForm } from "@/components/super-admin/reset-admin-password-form";
import { DeleteOrgForm } from "@/components/super-admin/delete-org-form";
import { RestoreOrgForm } from "@/components/super-admin/restore-org-form";
import { PurgeOrgForm } from "@/components/super-admin/purge-org-form";
import { ActionChipLink } from "@/components/super-admin/action-chip-link";
import { requireSession } from "@/lib/auth/guards";
import { getSuperAdminSnapshot } from "@/lib/services/dashboard-service";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  trial: "bg-amber-50 text-amber-700",
  suspended: "bg-red-50 text-red-700",
  archived: "bg-slate-200 text-slate-700",
};

export default async function SuperAdminPage() {
  const session = await requireSession(["super_admin"]);
  const snapshot = await getSuperAdminSnapshot();

  return (
    <AppShell eyebrow="Platform operations" session={session} title="Super admin control center">
      <div className="grid gap-5 lg:grid-cols-3">
        <KpiCard helper="Provisioned tenants" label="Organizations" value={snapshot.organizationCount.toString()} />
        <KpiCard helper="All-time captured feedback" label="Reviews" value={snapshot.reviewCount.toString()} />
        <KpiCard helper="Tenant service inventory" label="Services" value={snapshot.serviceCount.toString()} />
      </div>

      <div className="mt-6">
        <SectionCard
          description="Soft-deleted tenants can be restored safely. Permanent purge is available when required."
          title="Archived Organizations"
        >
          {snapshot.archivedOrganizations.length === 0 ? (
            <p className="text-sm text-slate-500">No archived organizations.</p>
          ) : (
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
          )}
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard
          description="Provision a new tenant and assign their admin account."
          title="Organizations"
          action={<CreateOrgForm />}
        >
          {snapshot.organizations.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              No organizations yet. Create one above to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="pb-3 pr-6 font-medium">Organization</th>
                    <th className="pb-3 pr-6 font-medium">Industry</th>
                    <th className="pb-3 pr-6 font-medium">Status</th>
                    <th className="pb-3 pr-6 font-medium">Reviews</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.organizations.map((organization) => (
                    <tr key={organization.publicId} className="border-t border-black/5 align-top">
                      <td className="py-4 pr-6">
                        <p className="font-semibold text-slate-950">{organization.name}</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400 mt-0.5">
                          {organization.publicId}
                        </p>
                      </td>
                      <td className="py-4 pr-6 text-slate-600">{organization.industry}</td>
                      <td className="py-4 pr-6">
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.15em] ${
                            STATUS_STYLES[organization.status] ?? "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {organization.status}
                        </span>
                      </td>
                      <td className="py-4 pr-6 text-slate-600">{organization.usage.reviewCount}</td>
                      <td className="py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <CreateAdminForm
                            orgPublicId={organization.publicId}
                            orgName={organization.name}
                          />
                          <CreateServiceForOrgForm orgPublicId={organization.publicId} orgName={organization.name} />
                          <DeleteOrgForm orgName={organization.name} orgPublicId={organization.publicId} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard
          description="Reset organization admin credentials without exposing users to self-service password reset yet."
          title="Admin Credentials"
        >
          <div className="space-y-4">
            {snapshot.organizationServices.map((group) => (
              <div key={`${group.organizationPublicId}-admins`} className="rounded-[20px] border border-black/10 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-950">{group.organizationName}</p>
                <p className="mt-0.5 text-xs uppercase tracking-[0.15em] text-slate-400">{group.organizationPublicId}</p>
                <div className="mt-3 space-y-2">
                  {group.admins.length === 0 ? (
                    <p className="text-xs text-slate-500">No admins assigned yet.</p>
                  ) : (
                    group.admins.map((admin) => (
                      <div key={admin.id} className="rounded-[14px] border border-black/10 bg-white p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{admin.name}</p>
                            <p className="text-xs text-slate-500">{admin.email} · {admin.role}</p>
                          </div>
                          <ResetAdminPasswordForm
                            adminEmail={admin.email}
                            adminName={admin.name}
                            orgPublicId={group.organizationPublicId}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard
          description="Generate review links and print assets. QR and print controls are restricted to superadmin."
          title="QR & Print Control"
        >
          <div className="space-y-4">
            {snapshot.organizationServices.map((group) => (
              <div key={group.organizationPublicId} className="rounded-[22px] border border-black/10 bg-[linear-gradient(180deg,#f8fafc_0%,#f5f7fb_100%)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{group.organizationName}</p>
                    <p className="mt-0.5 text-xs uppercase tracking-[0.15em] text-slate-400">{group.organizationPublicId}</p>
                  </div>
                  <span className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Superadmin only
                  </span>
                </div>

                {group.services.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">No services yet for this organization.</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {group.services.map((service) => (
                      <div key={service.publicId} className="rounded-[16px] border border-black/10 bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{service.name}</p>
                            <p className="text-xs text-slate-500">{service.category} · {service.ratingType}</p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Open links</p>
                            <div className="flex flex-wrap gap-2">
                              <ActionChipLink
                                href={`/r/${group.organizationPublicId}/${service.publicId}`}
                                icon="external"
                                label="Review"
                                target="_blank"
                                tone="neutral"
                              />
                              <ActionChipLink
                                href={`/qr/${group.organizationPublicId}/${service.publicId}/a6`}
                                icon="sheet"
                                label="A6"
                                target="_blank"
                                tone="print"
                              />
                              <ActionChipLink
                                href={`/qr/${group.organizationPublicId}/${service.publicId}/a4`}
                                icon="sheet"
                                label="A4 4x"
                                target="_blank"
                                tone="print"
                              />
                              <ActionChipLink
                                href={`/qr/${group.organizationPublicId}/${service.publicId}/a3`}
                                icon="sheet"
                                label="A3 8x"
                                target="_blank"
                                tone="print"
                              />
                            </div>

                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Download PDF</p>
                            <div className="flex flex-wrap gap-2">
                              <ActionChipLink
                                href={`/api/super-admin/qr-pdf/${group.organizationPublicId}/${service.publicId}?size=a6`}
                                icon="pdf"
                                label="A6 PDF"
                                tone="pdf"
                              />
                              <ActionChipLink
                                href={`/api/super-admin/qr-pdf/${group.organizationPublicId}/${service.publicId}?size=a4`}
                                icon="pdf"
                                label="A4 PDF"
                                tone="pdf"
                              />
                              <ActionChipLink
                                href={`/api/super-admin/qr-pdf/${group.organizationPublicId}/${service.publicId}?size=a3`}
                                icon="pdf"
                                label="A3 PDF"
                                tone="pdf"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
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
                <div key={log._id?.toString() || `${log.action}-${log.createdAt}`} className="rounded-[12px] border border-black/10 bg-slate-50 px-3 py-2">
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
