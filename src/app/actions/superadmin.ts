"use server";

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { getSessionUser } from "@/lib/auth/session";
import { createTenant } from "@/lib/services/organization-service";
import { findOrganizationByPublicId } from "@/lib/repositories/organizations";
import { createUser } from "@/lib/repositories/users";
import { hashPassword } from "@/lib/auth/password";

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
