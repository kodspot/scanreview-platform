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

  if (!name || !industry) {
    redirect("/super-admin?notice=error&message=Missing+name+or+industry");
  }

  const organization = await createTenant(name!, industry!);
  await logSuperAdminAction(
    actor,
    "organization.created",
    `Created organization ${organization.name}`,
    organization.publicId,
    { industry: organization.industry },
  );
  revalidateTag("super-admin-snapshot", 'max');
  redirect(`/super-admin?notice=success&message=Organization+${encodeURIComponent(organization.name)}+created`);
}

export async function createOrgAdminAction(formData: FormData) {
  const actor = await requireSuperAdmin();

  const orgPublicId = formData.get("orgPublicId") as string | null;
  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  const name = (formData.get("name") as string | null)?.trim();
  const password = formData.get("password") as string | null;

  if (!orgPublicId || !email || !name || !password) {
    redirect("/super-admin?notice=error&message=All+fields+required");
  }
  if (password!.length < 8) {
    redirect("/super-admin?notice=error&message=Password+must+be+8%2B+characters");
  }

  const organization = await findOrganizationByPublicId(orgPublicId!);
  if (!organization) {
    redirect("/super-admin?notice=error&message=Organization+not+found");
  }

  const existing = await findOrgAdminByEmail(organization!._id as ObjectId, email!);
  if (existing) {
    redirect("/super-admin?notice=error&message=An+admin+with+this+email+already+exists");
  }

  const now = new Date();
  await createUser({
    organizationId: organization!._id as ObjectId,
    email: email!,
    name: name!,
    passwordHash: await hashPassword(password!),
    role: "org_admin",
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  await logSuperAdminAction(
    actor,
    "admin.created",
    `Created admin ${email} for ${organization!.name}`,
    organization!.publicId,
    { email: email! },
  );

  revalidateTag("super-admin-snapshot", 'max');
  redirect(`/super-admin?notice=success&message=Admin+${encodeURIComponent(email!)}+created`);
}

export async function createServiceForOrgAction(formData: FormData) {
  const actor = await requireSuperAdmin();

  const orgPublicId = (formData.get("orgPublicId") as string | null)?.trim();
  const name = (formData.get("name") as string | null)?.trim();
  const category = (formData.get("category") as string | null)?.trim();
  const ratingType = ((formData.get("ratingType") as string | null) || "stars").trim();

  if (!orgPublicId || !name || !category) {
    redirect("/super-admin?notice=error&message=Missing+service+fields");
  }

  const organization = await findOrganizationByPublicId(orgPublicId!);
  if (!organization?._id) {
    redirect("/super-admin?notice=error&message=Organization+not+found");
  }

  const now = new Date();
  const servicePublicId = createPublicId("svc");

  const ratingDefaults = {
    stars: { ratingType: "stars" as const, maxRating: 5, lowRatingThreshold: 3 },
    emoji: { ratingType: "emoji" as const, maxRating: 5, lowRatingThreshold: 2 },
    numeric: { ratingType: "numeric" as const, maxRating: 10, lowRatingThreshold: 6 },
  };
  const ratingConfig = ratingDefaults[ratingType as keyof typeof ratingDefaults] ?? ratingDefaults.stars;

  const service: Omit<Service, "_id"> = {
    organizationId: organization!._id as ObjectId,
    publicId: servicePublicId,
    slug: toSlug(name!),
    name: name!,
    category: category!,
    status: "active",
    reviewConfig: {
      ...ratingConfig,
      promptTitle: `How was your ${name!}?`,
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
    organizationId: organization!._id as ObjectId,
    serviceId: result.insertedId,
    publicId: createPublicId("qr"),
    shortCode: servicePublicId,
    targetUrl: `${env.appUrl}/r/${orgPublicId}/${servicePublicId}`,
    design: { label: name!, variant: "classic" },
    printTemplateVersion: "v1",
    downloadCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  const qrCodes = await getCollection<QrCodeAsset>("qr_codes");
  await qrCodes.insertOne(qrAsset as QrCodeAsset);

  await incrementOrganizationUsage(organization!._id as ObjectId, {
    serviceCount: 1,
    qrCount: 1,
  });

  await logSuperAdminAction(
    actor,
    "service.created",
    `Created service ${name!} for ${organization!.name}`,
    organization!.publicId,
    { servicePublicId, category: category!, ratingType },
  );

  revalidateTag("super-admin-snapshot", 'max');
  revalidateTag("dashboard-snapshot", 'max');
  redirect(`/super-admin?notice=success&message=Service+${encodeURIComponent(name!)}+created`);
}

export async function resetOrgAdminPasswordAction(formData: FormData) {
  const actor = await requireSuperAdmin();

  const orgPublicId = (formData.get("orgPublicId") as string | null)?.trim();
  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  const password = (formData.get("password") as string | null)?.trim();

  if (!orgPublicId || !email || !password || password.length < 8) {
    redirect("/super-admin?notice=error&message=All+fields+required+(password+8%2B+chars)");
  }

  const organization = await findOrganizationByPublicId(orgPublicId!);
  if (!organization?._id) {
    redirect("/super-admin?notice=error&message=Organization+not+found");
  }

  const adminUser = await findOrgAdminByEmail(organization!._id as ObjectId, email!);
  if (!adminUser?._id) {
    redirect("/super-admin?notice=error&message=Admin+not+found");
  }

  const passwordHash = await hashPassword(password!);
  await updateUserPassword(adminUser!._id as ObjectId, passwordHash);

  await logSuperAdminAction(
    actor,
    "admin.password_reset",
    `Reset password for ${email}`,
    organization!.publicId,
    { email: email! },
  );

  revalidateTag("super-admin-snapshot", 'max');
  redirect(`/super-admin?notice=success&message=Password+reset+for+${encodeURIComponent(email!)}`);
}

export async function deleteOrganizationAction(formData: FormData) {
  const actor = await requireSuperAdmin();

  const orgPublicId = (formData.get("orgPublicId") as string | null)?.trim();
  const confirmPublicId = (formData.get("confirmPublicId") as string | null)?.trim();

  if (!orgPublicId || !confirmPublicId || orgPublicId !== confirmPublicId) {
    redirect("/super-admin?notice=error&message=Public+ID+confirmation+did+not+match");
  }

  const organization = await findOrganizationByPublicId(orgPublicId!);
  if (!organization?._id) {
    redirect("/super-admin?notice=error&message=Organization+not+found");
  }

  if (organization!.status === "archived") {
    redirect("/super-admin?notice=error&message=Organization+already+archived");
  }

  await archiveOrganizationById(organization!._id as ObjectId, {
    at: new Date(),
    byUserId: actor.userId,
    byName: actor.name,
    previousStatus: organization!.status,
  });

  await logSuperAdminAction(
    actor,
    "organization.archived",
    `Archived organization ${organization!.name}`,
    organization!.publicId,
  );

  revalidateTag("super-admin-snapshot", 'max');
  revalidateTag("dashboard-snapshot", 'max');
  redirect(`/super-admin?notice=success&message=Archived+${encodeURIComponent(organization!.name)}`);
}

export async function restoreOrganizationAction(formData: FormData) {
  const actor = await requireSuperAdmin();

  const orgPublicId = (formData.get("orgPublicId") as string | null)?.trim();
  if (!orgPublicId) {
    redirect("/super-admin?notice=error&message=Missing+organization+id");
  }

  const organization = await findOrganizationByPublicId(orgPublicId!);
  if (!organization?._id || organization.status !== "archived") {
    redirect("/super-admin?notice=error&message=Organization+not+archived");
  }

  await restoreOrganizationById(organization!._id as ObjectId);
  await logSuperAdminAction(
    actor,
    "organization.restored",
    `Restored organization ${organization!.name}`,
    organization!.publicId,
  );

  revalidateTag("super-admin-snapshot", 'max');
  revalidateTag("dashboard-snapshot", 'max');
  redirect(`/super-admin?notice=success&message=Restored+${encodeURIComponent(organization!.name)}`);
}

export async function purgeArchivedOrganizationAction(formData: FormData) {
  const actor = await requireSuperAdmin();

  const orgPublicId = (formData.get("orgPublicId") as string | null)?.trim();
  const confirmPublicId = (formData.get("confirmPublicId") as string | null)?.trim();

  if (!orgPublicId || !confirmPublicId || orgPublicId !== confirmPublicId) {
    redirect("/super-admin?notice=error&message=Public+ID+confirmation+did+not+match");
  }

  const organization = await findOrganizationByPublicId(orgPublicId!);
  if (!organization?._id || organization.status !== "archived") {
    redirect("/super-admin?notice=error&message=Only+archived+organizations+can+be+purged");
  }

  await Promise.all([
    deleteReviewsByOrganization(organization!._id as ObjectId),
    deleteServicesAndQrByOrganization(organization!._id as ObjectId),
    deleteUsersByOrganization(organization!._id as ObjectId),
  ]);

  await deleteOrganizationById(organization!._id as ObjectId);
  await logSuperAdminAction(
    actor,
    "organization.purged",
    `Purged organization ${organization!.name}`,
    organization!.publicId,
  );

  revalidateTag("super-admin-snapshot", 'max');
  revalidateTag("dashboard-snapshot", 'max');
  redirect(`/super-admin?notice=success&message=Purged+${encodeURIComponent(organization!.name)}`);
}
