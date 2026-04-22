import { unstable_cache } from "next/cache";
import { ObjectId } from "mongodb";
import { formatDistanceToNow } from "date-fns";
import { findOrganizationById, listOrganizations } from "@/lib/repositories/organizations";
import { aggregateDashboardMetrics, listRecentReviewsByOrganization } from "@/lib/repositories/reviews";
import { listServicesByOrganization } from "@/lib/repositories/services";
import { findUsersByOrganization } from "@/lib/repositories/users";
import type { DashboardFilters } from "@/lib/types";

export const getDashboardSnapshot = unstable_cache(
  async (organizationId: string, filters: DashboardFilters) => {
    const orgObjectId = new ObjectId(organizationId);
    const [organization, services, metrics, recentReviews] = await Promise.all([
      findOrganizationById(orgObjectId),
      listServicesByOrganization(orgObjectId),
      aggregateDashboardMetrics(orgObjectId, filters),
      listRecentReviewsByOrganization(orgObjectId, filters),
    ]);

    return {
      organization,
      services,
      metrics,
      recentReviews: recentReviews.map((review) => ({
        id: review._id?.toString(),
        ratingValue: review.ratingValue,
        sentiment: review.sentiment,
        submittedAt: formatDistanceToNow(review.submittedAt, { addSuffix: true }),
        requiresAttention: review.flags.requiresAttention,
        answers: review.answers,
        reviewer: review.customer.profile,
      })),
    };
  },
  ["dashboard-snapshot"],
  { revalidate: 90, tags: ["dashboard-snapshot"] },
);

export const getSuperAdminSnapshot = unstable_cache(
  async () => {
    const organizations = await listOrganizations();
    const organizationServices = await Promise.all(
      organizations.map(async (organization) => {
        const [services, users] = await Promise.all([
          listServicesByOrganization(organization._id as ObjectId),
          findUsersByOrganization(organization._id as ObjectId),
        ]);
        return {
          organizationPublicId: organization.publicId,
          organizationName: organization.name,
          admins: users
            .filter((user) => user.role === "org_admin" || user.role === "org_manager")
            .map((user) => ({
              id: user._id?.toString() || "",
              name: user.name,
              email: user.email,
              role: user.role,
              status: user.status,
            })),
          services: services.map((service) => ({
            publicId: service.publicId,
            name: service.name,
            category: service.category,
            ratingType: service.reviewConfig.ratingType,
          })),
        };
      }),
    );

    return {
      organizationCount: organizations.length,
      reviewCount: organizations.reduce((sum, org) => sum + org.usage.reviewCount, 0),
      serviceCount: organizations.reduce((sum, org) => sum + org.usage.serviceCount, 0),
      organizations,
      organizationServices,
    };
  },
  ["super-admin-snapshot"],
  { revalidate: 120, tags: ["super-admin-snapshot"] },
);
