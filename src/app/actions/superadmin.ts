"use server";

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { getSessionUser } from "@/lib/auth/session";
import { createTenant } from "@/lib/services/organization-service";
import { getCollection } from "@/lib/db/mongodb";
import {
  archiveOrganizationById,
  deleteOrganizationById,
  findOrganizationByPublicId,
  incrementOrganizationUsage,
  restoreOrganizationById,
} from "@/lib/repositories/organizations";
import {
  createUser,
  deleteUsersByOrganization,
  findOrgAdminByEmail,
  updateUserPassword,
} from "@/lib/repositories/users";
import { deleteReviewsByOrganization } from "@/lib/repositories/reviews";
import { deleteServicesAndQrByOrganization } from "@/lib/repositories/services";
import { createAuditLog } from "@/lib/repositories/audit-logs";
import { hashPassword } from "@/lib/auth/password";
import { env } from "@/lib/env";
import { createPublicId, toSlug } from "@/lib/utils";
import type { QrCodeAsset, Service, SessionUser } from "@/lib/types";

async function requireSuperAdmin() {
  const session = await getSessionUser();
  if (session?.role !== "super_admin") redirect("/login");
  return session;
}

async function logSuperAdminAction(
  actor: SessionUser,
  action: "organization.created" | "organization.archived" | "organization.restored" | "organization.purged" | "admin.created" | "admin.password_reset" | "service.created",
  summary: string,
  organizationPublicId?: string,
  metadata?: Record<string, string | number | boolean | null | undefined>,
) {
  await createAuditLog({
    actor: {
      userId: actor.userId,
      name: actor.name,
      email: actor.email,
      role: actor.role,
    },
    action,
    summary,
    organizationPublicId,
    metadata,
    createdAt: new Date(),
  });
}

export async function createOrganizationAction(formData: FormData) {
  const actor = await requireSuperAdmin();

  const name = (formData.get("name") as string | null)?.trim();
  const industry = (formData.get("industry") as string | null)?.trim();

  if (!name || !industry) return;

  const organization = await createTenant(name, industry);
  await logSuperAdminAction(
    actor,
    "organization.created",
    `Created organization ${organization.name}`,
    organization.publicId,
    { industry: organization.industry },
  );
  revalidateTag("super-admin-snapshot", {});
}

export async function createOrgAdminAction(formData: FormData) {
  const actor = await requireSuperAdmin();

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

  await logSuperAdminAction(
    actor,
    "admin.created",
    `Created admin ${email} for ${organization.name}`,
    organization.publicId,
    { email },
  );

  revalidateTag("super-admin-snapshot", {});
}

export async function createServiceForOrgAction(formData: FormData) {
  const actor = await requireSuperAdmin();

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

  await incrementOrganizationUsage(organization._id, {
    serviceCount: 1,
    qrCount: 1,
  });

  await logSuperAdminAction(
    actor,
    "service.created",
    `Created service ${name} for ${organization.name}`,
    organization.publicId,
    { servicePublicId, category, ratingType },
  );

  revalidateTag("super-admin-snapshot", {});
  revalidateTag("dashboard-snapshot", {});
}

export async function resetOrgAdminPasswordAction(formData: FormData) {
  const actor = await requireSuperAdmin();

  const orgPublicId = (formData.get("orgPublicId") as string | null)?.trim();
  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  const password = (formData.get("password") as string | null)?.trim();

  if (!orgPublicId || !email || !password || password.length < 8) {
    return;
  }

  const organization = await findOrganizationByPublicId(orgPublicId);
  if (!organization?._id) return;

  const adminUser = await findOrgAdminByEmail(organization._id, email);
  if (!adminUser?._id) return;

  const passwordHash = await hashPassword(password);
  await updateUserPassword(adminUser._id as ObjectId, passwordHash);

  await logSuperAdminAction(
    actor,
    "admin.password_reset",
    `Reset password for ${email}`,
    organization.publicId,
    { email },
  );

  revalidateTag("super-admin-snapshot", {});
}

export async function deleteOrganizationAction(formData: FormData) {
  const actor = await requireSuperAdmin();

  const orgPublicId = (formData.get("orgPublicId") as string | null)?.trim();
  const confirmPublicId = (formData.get("confirmPublicId") as string | null)?.trim();

  if (!orgPublicId || !confirmPublicId || orgPublicId !== confirmPublicId) {
    return;
  }

  const organization = await findOrganizationByPublicId(orgPublicId);
  if (!organization?._id) return;

  if (organization.status === "archived") return;

  await archiveOrganizationById(organization._id, {
    at: new Date(),
    byUserId: actor.userId,
    byName: actor.name,
    previousStatus: organization.status,
  });

  await logSuperAdminAction(
    actor,
    "organization.archived",
    `Archived organization ${organization.name}`,
    organization.publicId,
  );

  revalidateTag("super-admin-snapshot", {});
  revalidateTag("dashboard-snapshot", {});
}

export async function restoreOrganizationAction(formData: FormData) {
  const actor = await requireSuperAdmin();

  const orgPublicId = (formData.get("orgPublicId") as string | null)?.trim();
  if (!orgPublicId) return;

  const organization = await findOrganizationByPublicId(orgPublicId);
  if (!organization?._id || organization.status !== "archived") return;

  await restoreOrganizationById(organization._id);
  await logSuperAdminAction(
    actor,
    "organization.restored",
    `Restored organization ${organization.name}`,
    organization.publicId,
  );

  revalidateTag("super-admin-snapshot", {});
  revalidateTag("dashboard-snapshot", {});
}

export async function purgeArchivedOrganizationAction(formData: FormData) {
  const actor = await requireSuperAdmin();

  const orgPublicId = (formData.get("orgPublicId") as string | null)?.trim();
  const confirmPublicId = (formData.get("confirmPublicId") as string | null)?.trim();

  if (!orgPublicId || !confirmPublicId || orgPublicId !== confirmPublicId) {
    return;
  }

  const organization = await findOrganizationByPublicId(orgPublicId);
  if (!organization?._id || organization.status !== "archived") return;

  await Promise.all([
    deleteReviewsByOrganization(organization._id),
    deleteServicesAndQrByOrganization(organization._id),
    deleteUsersByOrganization(organization._id),
  ]);

  await deleteOrganizationById(organization._id);
  await logSuperAdminAction(
    actor,
    "organization.purged",
    `Purged organization ${organization.name}`,
    organization.publicId,
  );

  revalidateTag("super-admin-snapshot", {});
  revalidateTag("dashboard-snapshot", {});
}
