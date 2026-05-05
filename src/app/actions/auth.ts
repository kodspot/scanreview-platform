"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authenticateUser, authenticateSuperAdminByKey } from "@/lib/services/auth-service";
import { clearSessionCookie, setSessionCookie, signSession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  consumeResetTokenAndSetPassword,
  requestPasswordReset,
} from "@/lib/services/password-reset-service";

const ALLOWED_NEXT_PREFIXES = ["/dashboard", "/super-admin"];

function safeNext(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || !value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  if (!ALLOWED_NEXT_PREFIXES.some((p) => value === p || value.startsWith(`${p}/`))) {
    return null;
  }
  return value;
}

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

  const requestedNext = safeNext(formData.get("next"));
  if (requestedNext) {
    redirect(requestedNext);
  }

  redirect(sessionUser.role === "super_admin" ? "/super-admin" : "/dashboard");
}

export async function adminKeyLoginAction(formData: FormData) {
  const adminKey = formData.get("admin_key") as string;

  if (!adminKey || !adminKey.trim()) {
    redirect("/platform-provision?error=invalid_input");
  }

  const sessionUser = await authenticateSuperAdminByKey(adminKey.trim());

  if (!sessionUser) {
    redirect("/platform-provision?error=invalid_credentials");
  }

  const token = await signSession(sessionUser);
  await setSessionCookie(token);

  redirect("/super-admin");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  if (!email || email.length < 5 || email.length > 200 || !email.includes("@")) {
    redirect("/forgot-password?error=invalid_input");
  }

  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    "anon";

  // Strong rate limit on the public reset endpoint to prevent enumeration.
  const limiter = checkRateLimit(`pwd-reset-req:${ip}`, 5, 15 * 60_000);
  if (!limiter.allowed) {
    redirect("/forgot-password?error=rate_limited");
  }

  await requestPasswordReset(email!, ip);
  redirect("/forgot-password?notice=sent");
}

export async function performPasswordResetAction(formData: FormData) {
  const token = (formData.get("token") as string | null)?.trim();
  const password = formData.get("password") as string | null;
  const confirm = formData.get("confirm") as string | null;

  if (!token) {
    redirect("/reset-password?error=invalid_token");
  }
  if (!password || !confirm || password !== confirm) {
    redirect(`/reset-password?token=${encodeURIComponent(token!)}&error=mismatch`);
  }
  if (password.length < 8) {
    redirect(`/reset-password?token=${encodeURIComponent(token!)}&error=weak`);
  }

  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    "anon";
  const limiter = checkRateLimit(`pwd-reset-do:${ip}`, 10, 15 * 60_000);
  if (!limiter.allowed) {
    redirect("/reset-password?error=rate_limited");
  }

  const result = await consumeResetTokenAndSetPassword(token!, password);
  if (!result.ok) {
    if (result.reason === "expired") {
      redirect("/reset-password?error=expired");
    }
    if (result.reason === "weak_password") {
      redirect(`/reset-password?token=${encodeURIComponent(token!)}&error=weak`);
    }
    redirect("/reset-password?error=invalid_token");
  }

  redirect("/login?error=password_reset_success");
}
