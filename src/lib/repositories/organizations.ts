import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db/mongodb";
import type { Organization } from "@/lib/types";

export async function getOrganizationsCollection() {
  return getCollection<Organization>("organizations");
}

export async function findOrganizationByPublicId(publicId: string) {
  const collection = await getOrganizationsCollection();
  return collection.findOne({ publicId });
}

export async function findOrganizationById(id: string | ObjectId) {
  const collection = await getOrganizationsCollection();
  return collection.findOne({ _id: typeof id === "string" ? new ObjectId(id) : id });
}

export async function listOrganizations() {
  const collection = await getOrganizationsCollection();
  return collection.find({}).sort({ createdAt: -1 }).toArray();
}

export async function createOrganization(organization: Organization) {
  const collection = await getOrganizationsCollection();
  await collection.insertOne(organization);
  return organization;
}

export async function deleteOrganizationById(organizationId: ObjectId) {
  const collection = await getOrganizationsCollection();
  return collection.deleteOne({ _id: organizationId });
}

export async function incrementOrganizationUsage(
  organizationId: ObjectId,
  patch: Partial<Organization["usage"]>,
) {
  const collection = await getOrganizationsCollection();

  await collection.updateOne(
    { _id: organizationId },
    {
      $inc: {
        ...(typeof patch.reviewCount === "number" ? { "usage.reviewCount": patch.reviewCount } : {}),
        ...(typeof patch.serviceCount === "number" ? { "usage.serviceCount": patch.serviceCount } : {}),
        ...(typeof patch.qrCount === "number" ? { "usage.qrCount": patch.qrCount } : {}),
      },
      ...(patch.lastReviewAt ? { $set: { "usage.lastReviewAt": patch.lastReviewAt } } : {}),
    },
  );
}
