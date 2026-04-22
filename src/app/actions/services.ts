"use server";

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { getSessionUser } from "@/lib/auth/session";
import { findOrganizationById, incrementOrganizationUsage } from "@/lib/repositories/organizations";
import { getCollection } from "@/lib/db/mongodb";
import { createPublicId, toSlug } from "@/lib/utils";
import { env } from "@/lib/env";
import type { Service, QrCodeAsset } from "@/lib/types";

async function requireOrgAdmin() {
  const session = await getSessionUser();
  if (!session || !session.organizationId || !["org_admin", "org_manager"].includes(session.role)) {
    redirect("/login");
  }
  return session;
}

export async function createServiceAction(formData: FormData) {
  const session = await requireOrgAdmin();

  const name = (formData.get("name") as string | null)?.trim();
  const category = (formData.get("category") as string | null)?.trim();
  const ratingType = (formData.get("ratingType") as string) || "stars";

  if (!name || !category) return;

  const orgObjectId = new ObjectId(session.organizationId!);
  const organization = await findOrganizationById(orgObjectId);
  if (!organization) return;

  const now = new Date();
  const servicePublicId = createPublicId("svc");

  const ratingDefaults = {
    stars: { ratingType: "stars" as const, maxRating: 5, lowRatingThreshold: 3 },
    emoji: { ratingType: "emoji" as const, maxRating: 5, lowRatingThreshold: 2 },
    numeric: { ratingType: "numeric" as const, maxRating: 10, lowRatingThreshold: 6 },
  };
  const ratingConfig = ratingDefaults[ratingType as keyof typeof ratingDefaults] ?? ratingDefaults.stars;

  const service: Omit<Service, "_id"> = {
    organizationId: orgObjectId,
    publicId: servicePublicId,
    slug: toSlug(name),
    name,
    category,
    status: "active",
    reviewConfig: {
      ...ratingConfig,
      promptTitle: `How was your ${name}?`,
      promptDescription: "Share quick feedback — it only takes 10 seconds.",
      thankYouTitle: "Thank you for your feedback!",
      thankYouMessage: "Your response has been recorded and will help us improve.",
      questions: [],
      conditionalQuestions: [],
    },
    createdAt: now,
    updatedAt: now,
  };

  const services = await getCollection<Service>("services");
  const result = await services.insertOne(service as Service);

  // Auto-generate QR code asset for this service
  const appUrl = env.appUrl;
  const targetUrl = `${appUrl}/r/${organization.publicId}/${servicePublicId}`;

  const qrAsset: Omit<QrCodeAsset, "_id"> = {
    organizationId: orgObjectId,
    serviceId: result.insertedId,
    publicId: createPublicId("qr"),
    shortCode: servicePublicId,
    targetUrl,
    design: { label: name, variant: "classic" },
    printTemplateVersion: "v1",
    downloadCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  const qrCodes = await getCollection<QrCodeAsset>("qr_codes");
  await qrCodes.insertOne(qrAsset as QrCodeAsset);

  await incrementOrganizationUsage(orgObjectId, {
    serviceCount: 1,
    qrCount: 1,
  });

  revalidateTag("dashboard-snapshot", {});
}
