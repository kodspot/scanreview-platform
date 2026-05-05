import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db/mongodb";
import type { QrCodeAsset, Service } from "@/lib/types";

export async function getServicesCollection() {
  return getCollection<Service>("services");
}

export async function getQrCodesCollection() {
  return getCollection<QrCodeAsset>("qr_codes");
}

export async function findServiceByPublicIds(orgObjectId: ObjectId, servicePublicId: string) {
  const collection = await getServicesCollection();
  return collection.findOne({ organizationId: orgObjectId, publicId: servicePublicId });
}

export async function listServicesByOrganization(organizationId: ObjectId) {
  const collection = await getServicesCollection();
  return collection.find({ organizationId }).sort({ createdAt: -1 }).toArray();
}

export async function findQrCodeByService(serviceId: ObjectId) {
  const collection = await getQrCodesCollection();
  return collection.findOne({ serviceId });
}

export async function incrementQrCodeDownload(qrCodeId: ObjectId) {
  const collection = await getQrCodesCollection();
  await collection.updateOne(
    { _id: qrCodeId },
    {
      $inc: { downloadCount: 1 },
      $set: { lastDownloadedAt: new Date(), updatedAt: new Date() },
    },
  );
}

export async function deleteServicesAndQrByOrganization(organizationId: ObjectId) {
  const serviceCollection = await getServicesCollection();
  const qrCollection = await getQrCodesCollection();

  await Promise.all([
    serviceCollection.deleteMany({ organizationId }),
    qrCollection.deleteMany({ organizationId }),
  ]);
}

export async function updateService(
  organizationId: ObjectId,
  servicePublicId: string,
  patch: Partial<Pick<Service, "name" | "category" | "status">>,
) {
  const collection = await getServicesCollection();
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof patch.name === "string" && patch.name.trim().length > 0) {
    update.name = patch.name.trim();
  }
  if (typeof patch.category === "string" && patch.category.trim().length > 0) {
    update.category = patch.category.trim();
  }
  if (patch.status === "active" || patch.status === "paused") {
    update.status = patch.status;
  }
  if (Object.keys(update).length === 1) return null;
  return collection.findOneAndUpdate(
    { organizationId, publicId: servicePublicId },
    { $set: update },
    { returnDocument: "after" },
  );
}

export async function deleteServiceByPublicId(organizationId: ObjectId, servicePublicId: string) {
  const collection = await getServicesCollection();
  const qrCollection = await getQrCodesCollection();
  const service = await collection.findOne({ organizationId, publicId: servicePublicId });
  if (!service?._id) return null;
  await qrCollection.deleteMany({ serviceId: service._id });
  await collection.deleteOne({ _id: service._id });
  return service;
}
