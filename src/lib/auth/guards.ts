import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import type { SessionUser, UserRole } from "@/lib/types";

export async function requireSession(roles?: UserRole[]) {
  const session = await getSessionUser();

  if (!session) {
    redirect("/login");
  }

  if (roles && !roles.includes(session.role)) {
    redirect(session.role === "super_admin" ? "/super-admin" : "/dashboard");
  }

  return session as SessionUser;
}
