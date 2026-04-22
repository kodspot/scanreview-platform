"use server";

import { redirect } from "next/navigation";
import { authenticateUser } from "@/lib/services/auth-service";
import { clearSessionCookie, setSessionCookie, signSession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation/auth";

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect("/login?error=invalid_input");
  }

  const sessionUser = await authenticateUser(parsed.data.email, parsed.data.password);

  if (!sessionUser) {
    redirect("/login?error=invalid_credentials");
  }

  const token = await signSession(sessionUser);
  await setSessionCookie(token);

  redirect(sessionUser.role === "super_admin" ? "/super-admin" : "/dashboard");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
