import Link from "next/link";
import { AppShell } from "@/components/shell/app-shell";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { CreateOrgForm } from "@/components/super-admin/create-org-form";
import { CreateAdminForm } from "@/components/super-admin/create-admin-form";
import { CreateServiceForOrgForm } from "@/components/super-admin/create-service-form";
import { requireSession } from "@/lib/auth/guards";
import { getSuperAdminSnapshot } from "@/lib/services/dashboard-service";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  trial: "bg-amber-50 text-amber-700",
  suspended: "bg-red-50 text-red-700",
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
          description="Generate review links and print assets. QR and print controls are restricted to superadmin."
          title="QR & Print Control"
        >
          <div className="space-y-4">
            {snapshot.organizationServices.map((group) => (
              <div key={group.organizationPublicId} className="rounded-[22px] border border-black/10 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-950">{group.organizationName}</p>
                <p className="mt-0.5 text-xs uppercase tracking-[0.15em] text-slate-400">{group.organizationPublicId}</p>

                {group.services.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">No services yet for this organization.</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {group.services.map((service) => (
                      <div key={service.publicId} className="rounded-[16px] border border-black/10 bg-white p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{service.name}</p>
                            <p className="text-xs text-slate-500">{service.category} · {service.ratingType}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/r/${group.organizationPublicId}/${service.publicId}`}
                              target="_blank"
                              className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] active:translate-y-px"
                            >
                              Review link
                            </Link>
                            <Link
                              href={`/qr/${group.organizationPublicId}/${service.publicId}/a6`}
                              target="_blank"
                              className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] active:translate-y-px"
                            >
                              A6
                            </Link>
                            <Link
                              href={`/qr/${group.organizationPublicId}/${service.publicId}/a4`}
                              target="_blank"
                              className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] active:translate-y-px"
                            >
                              A4 (4x)
                            </Link>
                            <Link
                              href={`/qr/${group.organizationPublicId}/${service.publicId}/a3`}
                              target="_blank"
                              className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] active:translate-y-px"
                            >
                              A3 (8x)
                            </Link>
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
    </AppShell>
  );
}
