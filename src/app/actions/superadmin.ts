"use server";

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { getSessionUser } from "@/lib/auth/session";
import { createTenant } from "@/lib/services/organization-service";
import { getCollection } from "@/lib/db/mongodb";
import { findOrganizationByPublicId } from "@/lib/repositories/organizations";
import { createUser } from "@/lib/repositories/users";
import { hashPassword } from "@/lib/auth/password";
import { env } from "@/lib/env";
import { createPublicId, toSlug } from "@/lib/utils";
import type { QrCodeAsset, Service } from "@/lib/types";

async function requireSuperAdmin() {
  const session = await getSessionUser();
  if (session?.role !== "super_admin") redirect("/login");
  return session;
}

export async function createOrganizationAction(formData: FormData) {
  await requireSuperAdmin();

  const name = (formData.get("name") as string | null)?.trim();
  const industry = (formData.get("industry") as string | null)?.trim();

  if (!name || !industry) return;

  await createTenant(name, industry);
  revalidateTag("super-admin-snapshot", {});
}

export async function createOrgAdminAction(formData: FormData) {
  await requireSuperAdmin();

  const orgPublicId = formData.get("orgPublicId") as string | null;
  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  const name = (formData.get("name") as string | null)?.trim();
  const password = formData.get("password") as string | null;

  if (!orgPublicId || !email || !name || !password) return;

  const organization = await findOrganizationByPublicId(orgPublicId);
  if (!organization) return;

  const now = new Date();
  await createUser({
    organizationId: organization._id as ObjectId,
    email,
    name,
    passwordHash: await hashPassword(password),
    role: "org_admin",
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  revalidateTag("super-admin-snapshot", {});
}

export async function createServiceForOrgAction(formData: FormData) {
  await requireSuperAdmin();

  const orgPublicId = (formData.get("orgPublicId") as string | null)?.trim();
  const name = (formData.get("name") as string | null)?.trim();
  const category = (formData.get("category") as string | null)?.trim();
  const ratingType = ((formData.get("ratingType") as string | null) || "stars").trim();

  if (!orgPublicId || !name || !category) return;

  const organization = await findOrganizationByPublicId(orgPublicId);
  if (!organization?._id) return;

  const now = new Date();
  const servicePublicId = createPublicId("svc");

  const ratingDefaults = {
    stars: { ratingType: "stars" as const, maxRating: 5, lowRatingThreshold: 3 },
    emoji: { ratingType: "emoji" as const, maxRating: 5, lowRatingThreshold: 2 },
    numeric: { ratingType: "numeric" as const, maxRating: 10, lowRatingThreshold: 6 },
  };
  const ratingConfig = ratingDefaults[ratingType as keyof typeof ratingDefaults] ?? ratingDefaults.stars;

  const service: Omit<Service, "_id"> = {
    organizationId: organization._id,
    publicId: servicePublicId,
    slug: toSlug(name),
    name,
    category,
    status: "active",
    reviewConfig: {
      ...ratingConfig,
      promptTitle: `How was your ${name}?`,
      promptDescription: "Share quick feedback - it only takes 10 seconds.",
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

  const qrAsset: Omit<QrCodeAsset, "_id"> = {
    organizationId: organization._id,
    serviceId: result.insertedId,
    publicId: createPublicId("qr"),
    shortCode: servicePublicId,
    targetUrl: `${env.appUrl}/r/${orgPublicId}/${servicePublicId}`,
    design: { label: name, variant: "classic" },
    printTemplateVersion: "v1",
    downloadCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  const qrCodes = await getCollection<QrCodeAsset>("qr_codes");
  await qrCodes.insertOne(qrAsset as QrCodeAsset);

  revalidateTag("super-admin-snapshot", {});
  revalidateTag("dashboard-snapshot", {});
}
