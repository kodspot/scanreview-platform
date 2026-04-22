import { getCollection } from "@/lib/db/mongodb";
import type { AuditLog } from "@/lib/types";

export async function getAuditLogsCollection() {
  return getCollection<AuditLog>("audit_logs");
}

export async function createAuditLog(log: Omit<AuditLog, "_id">) {
  const collection = await getAuditLogsCollection();
  await collection.insertOne(log as AuditLog);
}

export async function listRecentAuditLogs(limit = 20) {
  const collection = await getAuditLogsCollection();
  return collection.find({}).sort({ createdAt: -1 }).limit(limit).toArray();
}
