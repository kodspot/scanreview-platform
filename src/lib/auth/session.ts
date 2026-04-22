import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { getRequiredEnv } from "@/lib/env";
import { COOKIE_NAME } from "@/lib/auth/constants";
import type { SessionUser } from "@/lib/types";
import { z } from "zod";

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

const sessionPayloadSchema = z.object({
  userId: z.string(),
  organizationId: z.string().optional(),
  email: z.email(),
  name: z.string(),
  role: z.enum(["super_admin", "org_admin", "org_manager", "org_analyst"]),
});

function getSecret() {
  return new TextEncoder().encode(getRequiredEnv("AUTH_SECRET"));
}

export async function signSession(sessionUser: SessionUser) {
  return new SignJWT({ ...sessionUser })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySession(token: string) {
  const { payload } = await jwtVerify(token, getSecret());

  return sessionPayloadSchema.parse(payload) as SessionUser;
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    return await verifySession(token);
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

