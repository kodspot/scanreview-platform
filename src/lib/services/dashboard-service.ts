import { unstable_cache } from "next/cache";
import { ObjectId } from "mongodb";
import { formatDistanceToNow } from "date-fns";
import {
  findOrganizationById,
  listArchivedOrganizations,
  listOrganizations,
} from "@/lib/repositories/organizations";
import { aggregateDashboardMetrics, listRecentReviewsByOrganization } from "@/lib/repositories/reviews";
import { aggregateScanMetrics } from "@/lib/repositories/scans";
import { listServicesByOrganization } from "@/lib/repositories/services";
import { findUsersByOrganization } from "@/lib/repositories/users";
import { listRecentAuditLogs } from "@/lib/repositories/audit-logs";
import type { DashboardFilters } from "@/lib/types";

export const getDashboardSnapshot = unstable_cache(
  async (organizationId: string, filters: DashboardFilters) => {
    const orgObjectId = new ObjectId(organizationId);
    const [organization, services, metrics, scanMetrics, recentReviews] = await Promise.all([
      findOrganizationById(orgObjectId),
      listServicesByOrganization(orgObjectId),
      aggregateDashboardMetrics(orgObjectId, filters),
      aggregateScanMetrics(orgObjectId, filters),
      listRecentReviewsByOrganization(orgObjectId, filters),
    ]);

    const scanCount = scanMetrics.scanCount || 0;
    const reviewCount = metrics.reviewCount || 0;
    const conversionRate = scanCount > 0 ? Math.min(1, reviewCount / scanCount) : 0;

    // Merge reviews + scans into a single trend with both axes.
    const trendByDate = new Map<string, { date: string; reviewCount: number; averageRating: number; scanCount: number }>();
    for (const point of metrics.trend) {
      trendByDate.set(point.date, { ...point, scanCount: 0 });
    }
    for (const point of scanMetrics.trend) {
      const existing = trendByDate.get(point.date);
      if (existing) {
        existing.scanCount = point.scanCount;
      } else {
        trendByDate.set(point.date, { date: point.date, reviewCount: 0, averageRating: 0, scanCount: point.scanCount });
      }
    }
    const mergedTrend = Array.from(trendByDate.values()).sort((a, b) => a.date.localeCompare(b.date));

    return {
      organization,
      services,
      metrics: {
        ...metrics,
        scanCount,
        conversionRate,
        trend: mergedTrend,
      },
      recentReviews: recentReviews.map((review) => {
        const serviceKey = review.serviceId?.toString();
        const matchedService = services.find((service) => service._id?.toString() === serviceKey);
        const maxRating = matchedService?.reviewConfig.maxRating ?? 5;
        const ratingType = matchedService?.reviewConfig.ratingType ?? review.ratingType;
        return {
          id: review._id?.toString(),
          ratingValue: review.ratingValue,
          maxRating,
          ratingType,
          serviceName: matchedService?.name,
          sentiment: review.sentiment,
          submittedAt: formatDistanceToNow(review.submittedAt, { addSuffix: true }),
          requiresAttention: review.flags.requiresAttention,
          answers: review.answers,
          reviewer: review.customer.profile,
        };
      }),
    };
  },
  ["dashboard-snapshot"],
  { revalidate: 90, tags: ["dashboard-snapshot"] },
);

export const getSuperAdminSnapshot = unstable_cache(
  async () => {
    const [organizations, archivedOrganizations, recentAuditLogs] = await Promise.all([
      listOrganizations(),
      listArchivedOrganizations(),
      listRecentAuditLogs(12),
    ]);
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
      archivedOrganizations,
      organizationServices,
      recentAuditLogs,
    };
  },
  ["super-admin-snapshot"],
  { revalidate: 120, tags: ["super-admin-snapshot"] },
);
