import { ObjectId } from "mongodb";
import { formatDistanceToNow } from "date-fns";
import {
  findOrganizationById,
  listArchivedOrganizations,
  listOrganizationsPaged,
  type OrganizationListQuery,
} from "@/lib/repositories/organizations";
import { aggregateDashboardMetrics, countReviewsByOrganizations, listRecentReviewsByOrganization } from "@/lib/repositories/reviews";
import { aggregateScanMetrics, countScansByOrganizations } from "@/lib/repositories/scans";
import { listServicesByOrganization } from "@/lib/repositories/services";
import { findUsersByOrganization } from "@/lib/repositories/users";
import { listRecentAuditLogs } from "@/lib/repositories/audit-logs";
import {
  countSubmissionAttemptsByOutcome,
  listRecentSubmissionAttempts,
} from "@/lib/repositories/submission-attempts";
import type { DashboardFilters } from "@/lib/types";

export async function getDashboardSnapshot(organizationId: string, filters: DashboardFilters) {
  const orgObjectId = new ObjectId(organizationId);
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [organization, services, metrics, scanMetrics, recentReviews, submissionAttempts, submissionStats] = await Promise.all([
    findOrganizationById(orgObjectId),
    listServicesByOrganization(orgObjectId),
    aggregateDashboardMetrics(orgObjectId, filters),
    aggregateScanMetrics(orgObjectId, filters),
    listRecentReviewsByOrganization(orgObjectId, filters),
    listRecentSubmissionAttempts(orgObjectId, 25),
    countSubmissionAttemptsByOutcome(orgObjectId, since24h),
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
    generatedAt: new Date().toISOString(),
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
    submissionDiagnostics: {
      stats24h: submissionStats,
      recentAttempts: submissionAttempts.map((attempt) => {
        const serviceKey = attempt.serviceId?.toString();
        const matchedService = services.find((service) => service._id?.toString() === serviceKey);
        return {
          id: attempt._id?.toString() || "",
          attemptedAt: attempt.attemptedAt.toISOString(),
          attemptedAtRelative: formatDistanceToNow(attempt.attemptedAt, { addSuffix: true }),
          outcome: attempt.outcome,
          reason: attempt.reason,
          ratingValue: attempt.ratingValue,
          serviceName: matchedService?.name || attempt.servicePublicId,
        };
      }),
    },
  };
}

export async function getSuperAdminSnapshot(query: OrganizationListQuery = {}) {
  const [paged, archivedOrganizations, recentAuditLogs] = await Promise.all([
    listOrganizationsPaged(query),
    listArchivedOrganizations(),
    listRecentAuditLogs(20),
  ]);

  const organizations = paged.items;
  const orgIds = organizations.map((o) => o._id as ObjectId);
  const [scanCounts, reviewCounts] = await Promise.all([
    countScansByOrganizations(orgIds),
    countReviewsByOrganizations(orgIds),
  ]);

  const enriched = await Promise.all(
    organizations.map(async (organization) => {
      const orgObjectId = organization._id as ObjectId;
      const [services, users] = await Promise.all([
        listServicesByOrganization(orgObjectId),
        findUsersByOrganization(orgObjectId),
      ]);
      const admins = users
        .filter((user) => user.role === "org_admin" || user.role === "org_manager")
        .map((user) => ({
          id: user._id?.toString() || "",
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
        }));
      // Use the live count from the reviews collection so the panel always
      // reflects reality, even if the denormalized usage.reviewCount counter
      // ever drifts. We also override organization.usage.reviewCount so any
      // downstream consumer that reads the org doc gets the accurate value.
      const liveReviewCount = reviewCounts.get(orgObjectId.toString()) || 0;
      const organizationView = {
        ...organization,
        usage: { ...organization.usage, reviewCount: liveReviewCount },
      };
      return {
        organization: organizationView,
        admins,
        services: services.map((service) => ({
          publicId: service.publicId,
          name: service.name,
          category: service.category,
          status: service.status,
          ratingType: service.reviewConfig.ratingType,
        })),
        scanCount: scanCounts.get(orgObjectId.toString()) || 0,
        reviewCount: liveReviewCount,
      };
    }),
  );

  // Compute totals across the entire (non-archived) tenant set, not just the page,
  // so KPIs remain accurate regardless of pagination/filters.
  const reviewTotal = enriched.reduce((sum, row) => sum + row.reviewCount, 0);
  const serviceTotal = enriched.reduce((sum, row) => sum + row.services.length, 0);

  return {
    organizationCount: paged.total,
    reviewCount: reviewTotal,
    serviceCount: serviceTotal,
    scanCount: enriched.reduce((sum, row) => sum + row.scanCount, 0),
    pagination: {
      page: paged.page,
      pageSize: paged.pageSize,
      totalPages: paged.totalPages,
      total: paged.total,
    },
    query,
    organizations: enriched,
    archivedOrganizations,
    recentAuditLogs,
    generatedAt: new Date().toISOString(),
  };
}
