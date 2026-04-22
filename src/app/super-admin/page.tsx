import { AppShell } from "@/components/shell/app-shell";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { requireSession } from "@/lib/auth/guards";
import { getSuperAdminSnapshot } from "@/lib/services/dashboard-service";

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
        <SectionCard description="Feature flags, usage, and tenant health in one table." title="Organizations">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3 font-medium">Organization</th>
                  <th className="pb-3 font-medium">Industry</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Reviews</th>
                  <th className="pb-3 font-medium">Flags</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.organizations.map((organization) => (
                  <tr key={organization.publicId} className="border-t border-black/5 align-top">
                    <td className="py-4">
                      <p className="font-medium text-slate-950">{organization.name}</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{organization.publicId}</p>
                    </td>
                    <td className="py-4 text-slate-600">{organization.industry}</td>
                    <td className="py-4 text-slate-600">{organization.status}</td>
                    <td className="py-4 text-slate-600">{organization.usage.reviewCount}</td>
                    <td className="py-4 text-slate-600">
                      {Object.entries(organization.featureFlags)
                        .filter(([, enabled]) => enabled)
                        .map(([name]) => name)
                        .join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
