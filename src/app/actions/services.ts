"use server";

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { getSessionUser } from "@/lib/auth/session";
import { findOrganizationById, incrementOrganizationUsage } from "@/lib/repositories/organizations";
import { getCollection } from "@/lib/db/mongodb";
import { createPublicId, toSlug } from "@/lib/utils";
import { env } from "@/lib/env";
import {
  deleteServiceByPublicId,
  findServiceByPublicIds,
  updateService,
} from "@/lib/repositories/services";
import { createAuditLog } from "@/lib/repositories/audit-logs";
import type { Service, QrCodeAsset, SessionUser } from "@/lib/types";

async function requireOrgAdmin() {
  const session = await getSessionUser();
  if (!session || !session.organizationId || !["org_admin", "org_manager"].includes(session.role)) {
    redirect("/login");
  }
  return session;
}

async function logServiceAction(
  actor: SessionUser,
  action: "service.created" | "service.updated" | "service.archived",
  summary: string,
  organizationPublicId?: string,
  metadata?: Record<string, string | number | boolean | null | undefined>,
) {
  await createAuditLog({
    actor: { userId: actor.userId, name: actor.name, email: actor.email, role: actor.role },
    action,
    summary,
    organizationPublicId,
    metadata,
    createdAt: new Date(),
  });
}

export async function createServiceAction(formData: FormData) {
  const session = await requireOrgAdmin();

  const name = (formData.get("name") as string | null)?.trim();
  const category = (formData.get("category") as string | null)?.trim();
  const ratingType = (formData.get("ratingType") as string) || "stars";

  if (!name || !category) {
    redirect("/dashboard?notice=error&message=Name+and+category+required");
  }

  const orgObjectId = new ObjectId(session.organizationId!);
  const organization = await findOrganizationById(orgObjectId);
  if (!organization) {
    redirect("/dashboard?notice=error&message=Organization+not+found");
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
    organizationId: orgObjectId,
    publicId: servicePublicId,
    slug: toSlug(name!),
    name: name!,
    category: category!,
    status: "active",
    reviewConfig: {
      ...ratingConfig,
      promptTitle: `How was your ${name!}?`,
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
    design: { label: name!, variant: "classic" },
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

  await logServiceAction(
    session,
    "service.created",
    `Created service ${name!}`,
    organization.publicId,
    { servicePublicId, category: category!, ratingType },
  );

  revalidateTag("dashboard-snapshot", 'max');
  revalidateTag("super-admin-snapshot", 'max');
  redirect(`/dashboard?notice=success&message=Service+${encodeURIComponent(name!)}+created`);
}

export async function updateServiceAction(formData: FormData) {
  const session = await requireOrgAdmin();
  const servicePublicId = (formData.get("servicePublicId") as string | null)?.trim();
  const name = (formData.get("name") as string | null)?.trim();
  const category = (formData.get("category") as string | null)?.trim();
  const status = (formData.get("status") as string | null)?.trim();

  if (!servicePublicId) {
    redirect("/dashboard?notice=error&message=Missing+service+id");
  }

  const orgObjectId = new ObjectId(session.organizationId!);
  const organization = await findOrganizationById(orgObjectId);
  if (!organization) {
    redirect("/dashboard?notice=error&message=Organization+not+found");
  }

  const updated = await updateService(orgObjectId, servicePublicId!, {
    name: name || undefined,
    category: category || undefined,
    status: status === "active" || status === "paused" ? status : undefined,
  });

  if (!updated) {
    redirect("/dashboard?notice=error&message=Service+not+found+or+nothing+to+update");
  }

  await logServiceAction(
    session,
    "service.updated",
    `Updated service ${updated!.name}`,
    organization!.publicId,
    { servicePublicId: servicePublicId!, status: updated!.status },
  );

  revalidateTag("dashboard-snapshot", 'max');
  revalidateTag("super-admin-snapshot", 'max');
  revalidateTag("public-review-experience", 'max');
  redirect(`/dashboard?notice=success&message=Service+${encodeURIComponent(updated!.name)}+updated`);
}

export async function toggleServiceStatusAction(formData: FormData) {
  const session = await requireOrgAdmin();
  const servicePublicId = (formData.get("servicePublicId") as string | null)?.trim();
  if (!servicePublicId) {
    redirect("/dashboard?notice=error&message=Missing+service+id");
  }
  const orgObjectId = new ObjectId(session.organizationId!);
  const existing = await findServiceByPublicIds(orgObjectId, servicePublicId!);
  if (!existing) {
    redirect("/dashboard?notice=error&message=Service+not+found");
  }
  const nextStatus = existing!.status === "active" ? "paused" : "active";
  const updated = await updateService(orgObjectId, servicePublicId!, { status: nextStatus });
  await logServiceAction(
    session,
    "service.updated",
    `Set service ${existing!.name} to ${nextStatus}`,
    undefined,
    { servicePublicId: servicePublicId!, status: nextStatus },
  );
  revalidateTag("dashboard-snapshot", 'max');
  revalidateTag("super-admin-snapshot", 'max');
  revalidateTag("public-review-experience", 'max');
  redirect(
    `/dashboard?notice=success&message=Service+${encodeURIComponent(updated?.name || existing!.name)}+${nextStatus}`,
  );
}

export async function deleteServiceAction(formData: FormData) {
  const session = await requireOrgAdmin();
  if (session.role !== "org_admin") {
    redirect("/dashboard?notice=error&message=Only+admins+can+delete+services");
  }
  const servicePublicId = (formData.get("servicePublicId") as string | null)?.trim();
  const confirm = (formData.get("confirmPublicId") as string | null)?.trim();
  if (!servicePublicId || servicePublicId !== confirm) {
    redirect("/dashboard?notice=error&message=Service+ID+confirmation+did+not+match");
  }
  const orgObjectId = new ObjectId(session.organizationId!);
  const removed = await deleteServiceByPublicId(orgObjectId, servicePublicId!);
  if (!removed) {
    redirect("/dashboard?notice=error&message=Service+not+found");
  }

  await incrementOrganizationUsage(orgObjectId, {
    serviceCount: -1,
    qrCount: -1,
  });

  await logServiceAction(
    session,
    "service.archived",
    `Deleted service ${removed!.name}`,
    undefined,
    { servicePublicId: servicePublicId! },
  );

  revalidateTag("dashboard-snapshot", 'max');
  revalidateTag("super-admin-snapshot", 'max');
  revalidateTag("public-review-experience", 'max');
  redirect(`/dashboard?notice=success&message=Service+${encodeURIComponent(removed!.name)}+deleted`);
}
