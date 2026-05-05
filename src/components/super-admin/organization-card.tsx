"use client";

import { useState } from "react";
import { CreateAdminForm } from "@/components/super-admin/create-admin-form";
import { CreateServiceForOrgForm } from "@/components/super-admin/create-service-form";
import { ResetAdminPasswordForm } from "@/components/super-admin/reset-admin-password-form";
import { DeleteOrgForm } from "@/components/super-admin/delete-org-form";
import { ActionChipLink } from "@/components/super-admin/action-chip-link";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  trial: "bg-amber-50 text-amber-800 border-amber-200",
  suspended: "bg-red-50 text-red-700 border-red-200",
  archived: "bg-slate-100 text-slate-600 border-slate-200",
};

const SERVICE_STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  paused: "bg-amber-50 text-amber-800 border-amber-200",
};

export type OrgCardAdmin = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLoginAt: string | null;
};

export type OrgCardService = {
  publicId: string;
  name: string;
  category: string;
  status: string;
  ratingType: string;
};

export type OrgCardData = {
  publicId: string;
  name: string;
  industry: string;
  status: string;
  reviewCount: number;
  serviceCount: number;
  scanCount: number;
  conversionRate: number;
  createdAt?: string;
};

interface OrganizationCardProps {
  organization: OrgCardData;
  admins: OrgCardAdmin[];
  services: OrgCardService[];
  defaultExpanded?: boolean;
}

export function OrganizationCard({ organization, admins, services, defaultExpanded = false }: OrganizationCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [tab, setTab] = useState<"overview" | "admins" | "services">("overview");
  const conversionPct = (organization.conversionRate * 100).toFixed(1);

  return (
    <div className="rounded-[24px] border border-black/10 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-950">{organization.name}</h3>
            <span
              className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                STATUS_STYLES[organization.status] ?? "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              {organization.status}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-slate-400">
            {organization.publicId} · {organization.industry}
          </p>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
            <span><span className="font-semibold text-slate-900">{organization.reviewCount}</span> reviews</span>
            <span><span className="font-semibold text-slate-900">{organization.scanCount}</span> scans</span>
            <span><span className="font-semibold text-slate-900">{services.length}</span> services</span>
            <span><span className="font-semibold text-slate-900">{admins.length}</span> admins</span>
            <span><span className="font-semibold text-slate-900">{conversionPct}%</span> conversion</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CreateAdminForm orgPublicId={organization.publicId} orgName={organization.name} />
          <CreateServiceForOrgForm orgPublicId={organization.publicId} orgName={organization.name} />
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            aria-expanded={expanded}
          >
            {expanded ? "Collapse" : "Manage"}
          </button>
          <DeleteOrgForm orgPublicId={organization.publicId} orgName={organization.name} />
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-black/5 bg-slate-50/60 px-5 py-4">
          <div className="mb-4 flex flex-wrap gap-1 rounded-full bg-white p-1 border border-black/5 w-fit">
            {(["overview", "admins", "services"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
                  tab === key ? "bg-slate-950 text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {key}
                {key === "admins" ? ` · ${admins.length}` : key === "services" ? ` · ${services.length}` : ""}
              </button>
            ))}
          </div>

          {tab === "overview" ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[16px] border border-black/5 bg-white p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Tenant</p>
                <p className="mt-1 text-sm text-slate-700 break-all">{organization.publicId}</p>
              </div>
              <div className="rounded-[16px] border border-black/5 bg-white p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Industry</p>
                <p className="mt-1 text-sm text-slate-700">{organization.industry}</p>
              </div>
              <div className="rounded-[16px] border border-black/5 bg-white p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Created</p>
                <p className="mt-1 text-sm text-slate-700">
                  {organization.createdAt ? new Date(organization.createdAt).toLocaleDateString() : "—"}
                </p>
              </div>
            </div>
          ) : null}

          {tab === "admins" ? (
            admins.length === 0 ? (
              <p className="text-sm text-slate-500">No admin assigned. Use “Add Admin” above to provision the first user.</p>
            ) : (
              <div className="space-y-2">
                {admins.map((admin) => (
                  <div key={admin.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-black/5 bg-white p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{admin.name}</p>
                      <p className="text-xs text-slate-500 truncate">{admin.email} · {admin.role} · {admin.status}</p>
                      {admin.lastLoginAt ? (
                        <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-400">
                          Last login {new Date(admin.lastLoginAt).toLocaleDateString()}
                        </p>
                      ) : null}
                    </div>
                    <ResetAdminPasswordForm
                      adminEmail={admin.email}
                      adminName={admin.name}
                      orgPublicId={organization.publicId}
                    />
                  </div>
                ))}
              </div>
            )
          ) : null}

          {tab === "services" ? (
            services.length === 0 ? (
              <p className="text-sm text-slate-500">No services yet. Use “Add Service” above to provision the first one.</p>
            ) : (
              <div className="space-y-3">
                {services.map((service) => (
                  <div key={service.publicId} className="rounded-[16px] border border-black/5 bg-white p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-slate-900">{service.name}</p>
                          <span
                            className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                              SERVICE_STATUS_STYLES[service.status] ?? "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {service.status}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {service.category} · {service.ratingType} · {service.publicId}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Open links</p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <ActionChipLink
                            href={`/r/${organization.publicId}/${service.publicId}`}
                            icon="external"
                            label="Review"
                            target="_blank"
                            tone="neutral"
                          />
                          <ActionChipLink
                            href={`/qr/${organization.publicId}/${service.publicId}/a6`}
                            icon="sheet"
                            label="A6"
                            target="_blank"
                            tone="print"
                          />
                          <ActionChipLink
                            href={`/qr/${organization.publicId}/${service.publicId}/a4`}
                            icon="sheet"
                            label="A4 4x"
                            target="_blank"
                            tone="print"
                          />
                          <ActionChipLink
                            href={`/qr/${organization.publicId}/${service.publicId}/a3`}
                            icon="sheet"
                            label="A3 8x"
                            target="_blank"
                            tone="print"
                          />
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Download PDF</p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <ActionChipLink
                            href={`/api/super-admin/qr-pdf/${organization.publicId}/${service.publicId}?size=a6`}
                            icon="pdf"
                            label="A6 PDF"
                            tone="pdf"
                          />
                          <ActionChipLink
                            href={`/api/super-admin/qr-pdf/${organization.publicId}/${service.publicId}?size=a4`}
                            icon="pdf"
                            label="A4 PDF"
                            tone="pdf"
                          />
                          <ActionChipLink
                            href={`/api/super-admin/qr-pdf/${organization.publicId}/${service.publicId}?size=a3`}
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
            )
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
