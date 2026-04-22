import { createOrganization } from "@/lib/repositories/organizations";
import type { Organization } from "@/lib/types";
import { createPublicId, toSlug } from "@/lib/utils";

export async function createTenant(name: string, industry: string): Promise<Organization> {
  const now = new Date();
  const organization: Organization = {
    publicId: createPublicId("org"),
    name,
    slug: toSlug(name),
    industry,
    status: "trial",
    theme: {
      primary: "#0f766e",
      secondary: "#f59e0b",
      accent: "#ea580c",
      surface: "#f7f4ea",
      text: "#0f172a",
    },
    featureFlags: {
      lowRatingAlerts: true,
      customBranding: true,
      advancedAnalytics: true,
      printableAssets: true,
    },
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
