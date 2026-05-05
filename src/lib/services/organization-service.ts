import { createOrganization } from "@/lib/repositories/organizations";
import type { FeatureFlags, Organization, OrganizationTheme } from "@/lib/types";
import { createPublicId, toSlug } from "@/lib/utils";

export const DEFAULT_THEME: OrganizationTheme = {
  primary: "#0f766e",
  secondary: "#f59e0b",
  accent: "#ea580c",
  surface: "#f7f4ea",
  text: "#0f172a",
};

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  lowRatingAlerts: true,
  customBranding: true,
  advancedAnalytics: true,
  printableAssets: true,
};

export async function createTenant(name: string, industry: string): Promise<Organization> {
  const now = new Date();
  const organization: Organization = {
    publicId: createPublicId("org"),
    name,
    slug: toSlug(name),
    industry,
    status: "trial",
    theme: { ...DEFAULT_THEME },
    featureFlags: { ...DEFAULT_FEATURE_FLAGS },
    usage: {
      reviewCount: 0,
      serviceCount: 0,
      qrCount: 0,
    },
    createdAt: now,
    updatedAt: now,
  };

  await createOrganization(organization);
  return organization;
}
