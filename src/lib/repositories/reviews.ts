import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db/mongodb";
import type { DashboardFilters, Review } from "@/lib/types";

export async function getReviewsCollection() {
  return getCollection<Review>("reviews");
}

export async function createReview(review: Review) {
  const collection = await getReviewsCollection();
  await collection.insertOne(review);
  return review;
}

export async function deleteReviewsByOrganization(organizationId: ObjectId) {
  const collection = await getReviewsCollection();
  return collection.deleteMany({ organizationId });
}

export async function countReviewsByOrganizations(
  organizationIds: ObjectId[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (organizationIds.length === 0) return result;
  const collection = await getReviewsCollection();
  const rows = await collection
    .aggregate<{ _id: ObjectId; count: number }>([
      { $match: { organizationId: { $in: organizationIds } } },
      { $group: { _id: "$organizationId", count: { $sum: 1 } } },
    ])
    .toArray();
  for (const row of rows) {
    result.set(row._id.toString(), row.count);
  }
  return result;
}

export async function listRecentReviewsByOrganization(
  organizationId: ObjectId,
  filters: DashboardFilters,
) {
  const collection = await getReviewsCollection();
  const query: Record<string, unknown> = { organizationId };

  if (filters.serviceId) {
    query.serviceId = new ObjectId(filters.serviceId);
  }

  if (filters.from || filters.to) {
    query.submittedAt = {
      ...(filters.from ? { $gte: new Date(filters.from) } : {}),
      ...(filters.to ? { $lte: new Date(filters.to) } : {}),
    };
  }

  return collection.find(query).sort({ submittedAt: -1 }).limit(8).toArray();
}

export async function aggregateDashboardMetrics(
  organizationId: ObjectId,
  filters: DashboardFilters,
) {
  const collection = await getReviewsCollection();
  const match: Record<string, unknown> = { organizationId };

  if (filters.serviceId) {
    match.serviceId = new ObjectId(filters.serviceId);
  }

  if (filters.from || filters.to) {
    match.submittedAt = {
      ...(filters.from ? { $gte: new Date(filters.from) } : {}),
      ...(filters.to ? { $lte: new Date(filters.to) } : {}),
    };
  }

  const [summary] = await collection
    .aggregate<{
      reviewCount: number;
      averageRating: number;
      lowRatingCount: number;
      trend: Array<{ date: string; averageRating: number; reviewCount: number }>;
      distribution: Array<{ rating: number; count: number }>;
      bySentiment: Array<{ sentiment: string; count: number }>;
    }>([
      { $match: match },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                reviewCount: { $sum: 1 },
                averageRating: { $avg: "$ratingValue" },
                lowRatingCount: {
                  $sum: {
                    $cond: [{ $eq: ["$flags.requiresAttention", true] }, 1, 0],
                  },
                },
              },
            },
          ],
          trend: [
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$submittedAt" },
                },
                averageRating: { $avg: "$ratingValue" },
                reviewCount: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
          distribution: [
            { $group: { _id: { $floor: "$ratingValue" }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
          ],
          bySentiment: [
            { $group: { _id: "$sentiment", count: { $sum: 1 } } },
          ],
        },
      },
      {
        $project: {
          summary: { $first: "$summary" },
          trend: 1,
          distribution: 1,
          bySentiment: 1,
        },
      },
      {
        $project: {
          reviewCount: { $ifNull: ["$summary.reviewCount", 0] },
          averageRating: { $ifNull: ["$summary.averageRating", 0] },
          lowRatingCount: { $ifNull: ["$summary.lowRatingCount", 0] },
          trend: {
            $map: {
              input: "$trend",
              as: "point",
              in: {
                date: "$$point._id",
                averageRating: { $round: ["$$point.averageRating", 2] },
                reviewCount: "$$point.reviewCount",
              },
            },
          },
          distribution: {
            $map: {
              input: "$distribution",
              as: "d",
              in: { rating: "$$d._id", count: "$$d.count" },
            },
          },
          bySentiment: {
            $map: {
              input: "$bySentiment",
              as: "s",
              in: { sentiment: "$$s._id", count: "$$s.count" },
            },
          },
        },
      },
    ])
    .toArray();

  return (
    summary || {
      reviewCount: 0,
      averageRating: 0,
      lowRatingCount: 0,
      trend: [],
      distribution: [],
      bySentiment: [],
    }
  );
}
