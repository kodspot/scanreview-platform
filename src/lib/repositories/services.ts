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
