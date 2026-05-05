import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db/mongodb";
import type { QrScanEvent } from "@/lib/types";

export async function getScansCollection() {
  return getCollection<QrScanEvent>("qr_scans");
}

export async function recordScan(event: Omit<QrScanEvent, "_id">) {
  const collection = await getScansCollection();
  await collection.insertOne(event as QrScanEvent);
}

export async function deleteScansByOrganization(organizationId: ObjectId) {
  const collection = await getScansCollection();
  return collection.deleteMany({ organizationId });
}

export async function aggregateScanMetrics(
  organizationId: ObjectId,
  filters: { serviceId?: string; from?: string; to?: string },
) {
  const collection = await getScansCollection();
  const match: Record<string, unknown> = { organizationId };
  if (filters.serviceId) match.serviceId = new ObjectId(filters.serviceId);
  if (filters.from || filters.to) {
    match.scannedAt = {
      ...(filters.from ? { $gte: new Date(filters.from) } : {}),
      ...(filters.to ? { $lte: new Date(filters.to) } : {}),
    };
  }

  const [summary] = await collection
    .aggregate<{ scanCount: number; trend: Array<{ date: string; scanCount: number }> }>([
      { $match: match },
      {
        $facet: {
          summary: [{ $group: { _id: null, scanCount: { $sum: 1 } } }],
          trend: [
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$scannedAt" } },
                scanCount: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
        },
      },
      {
        $project: {
          scanCount: { $ifNull: [{ $first: "$summary.scanCount" }, 0] },
          trend: {
            $map: {
              input: "$trend",
              as: "p",
              in: { date: "$$p._id", scanCount: "$$p.scanCount" },
            },
          },
        },
      },
    ])
    .toArray();

  return summary || { scanCount: 0, trend: [] };
}

export async function countScansByOrganizations(organizationIds: ObjectId[]) {
  if (organizationIds.length === 0) return new Map<string, number>();
  const collection = await getScansCollection();
  const rows = await collection
    .aggregate<{ _id: ObjectId; count: number }>([
      { $match: { organizationId: { $in: organizationIds } } },
      { $group: { _id: "$organizationId", count: { $sum: 1 } } },
    ])
    .toArray();
  const map = new Map<string, number>();
  for (const row of rows) map.set(row._id.toString(), row.count);
  return map;
}
