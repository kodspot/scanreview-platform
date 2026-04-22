import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { findOrganizationById } from "@/lib/repositories/organizations";
import type { SessionUser, UserRole } from "@/lib/types";

export async function requireSession(roles?: UserRole[]) {
  const session = await getSessionUser();

  if (!session) {
    redirect("/login");
  }

  if (roles && !roles.includes(session.role)) {
    redirect(session.role === "super_admin" ? "/super-admin" : "/dashboard");
  }

  if (session.role !== "super_admin" && session.organizationId) {
    const organization = await findOrganizationById(session.organizationId);
    if (!organization || organization.status === "archived" || organization.status === "suspended") {
      redirect("/login?error=invalid_credentials");
    }
  }

  return session as SessionUser;
}
