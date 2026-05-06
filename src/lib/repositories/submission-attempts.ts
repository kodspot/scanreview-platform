import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db/mongodb";
import type { ReviewSubmissionAttempt, ReviewSubmissionOutcome } from "@/lib/types";

export async function getSubmissionAttemptsCollection() {
  return getCollection<ReviewSubmissionAttempt>("review_submission_attempts");
}

export async function recordSubmissionAttempt(attempt: ReviewSubmissionAttempt) {
  try {
    const collection = await getSubmissionAttemptsCollection();
    await collection.insertOne(attempt);
  } catch (error) {
    // Never let telemetry break the request path.
    console.warn("[submission-attempt.persist-failed]", error instanceof Error ? error.message : error);
  }
}

export async function listRecentSubmissionAttempts(
  organizationId: ObjectId,
  limit = 20,
) {
  const collection = await getSubmissionAttemptsCollection();
  return collection
    .find({ organizationId })
    .sort({ attemptedAt: -1 })
    .limit(limit)
    .toArray();
}

export async function deleteSubmissionAttemptsByOrganization(organizationId: ObjectId) {
  const collection = await getSubmissionAttemptsCollection();
  return collection.deleteMany({ organizationId });
}

export async function countSubmissionAttemptsByOutcome(
  organizationId: ObjectId,
  since: Date,
): Promise<Record<ReviewSubmissionOutcome | "total", number>> {
  const collection = await getSubmissionAttemptsCollection();
  const rows = await collection
    .aggregate<{ _id: ReviewSubmissionOutcome; count: number }>([
      { $match: { organizationId, attemptedAt: { $gte: since } } },
      { $group: { _id: "$outcome", count: { $sum: 1 } } },
    ])
    .toArray();

  const result = {
    success: 0,
    validation_failed: 0,
    missing_required: 0,
    rate_limited: 0,
    service_not_found: 0,
    invalid_json: 0,
    error: 0,
    total: 0,
  } as Record<ReviewSubmissionOutcome | "total", number>;

  for (const row of rows) {
    if (row._id in result) {
      result[row._id] = row.count;
    }
    result.total += row.count;
  }
  return result;
}
