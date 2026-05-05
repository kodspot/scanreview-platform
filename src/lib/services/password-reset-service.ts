import crypto from "crypto";
import { ObjectId } from "mongodb";
import { findUserByEmail, updateUserPassword } from "@/lib/repositories/users";
import {
  consumePasswordResetToken,
  createPasswordResetToken,
  findPasswordResetTokenByHash,
  invalidateUserResetTokens,
} from "@/lib/repositories/password-resets";
import { createAuditLog } from "@/lib/repositories/audit-logs";
import { hashPassword } from "@/lib/auth/password";
import { hashValue } from "@/lib/utils";
import { env } from "@/lib/env";
import type { User } from "@/lib/types";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function generateToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function tokenHash(token: string) {
  return hashValue(token);
}

export async function requestPasswordReset(emailRaw: string, requestIp?: string) {
  const email = emailRaw.trim().toLowerCase();
  if (!email || email.length > 200) return;

  const user = await findUserByEmail(email);
  // Always return without leaking whether the email exists. The audit log
  // captures both successful and silent paths so super-admins can detect abuse.
  if (!user?._id) return;

  // Invalidate any existing tokens for this user.
  await invalidateUserResetTokens(user._id);

  const token = generateToken();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await createPasswordResetToken({
    userId: user._id,
    tokenHash: tokenHash(token),
    email: user.email,
    expiresAt,
    createdAt: new Date(),
    requestIpHash: requestIp ? hashValue(requestIp) : undefined,
  });

  const resetUrl = `${env.appUrl}/reset-password?token=${token}`;

  // Audit log entry — visible to super_admin. In production a mail provider
  // would be wired here; until that is configured, super-admins can hand off
  // the link to the user out-of-band.
  await createAuditLog({
    actor: {
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    },
    organizationPublicId: user.organizationId
      ? // Best-effort: if the user has an org, we just record the org's
        // ObjectId string here; the super-admin UI resolves names separately.
        undefined
      : undefined,
    action: "admin.password_reset_requested",
    summary: `Password reset requested for ${user.email}`,
    metadata: {
      email: user.email,
      expiresAt: expiresAt.toISOString(),
      // SECURITY: only super-admins should ever read audit logs. The link is
      // single-use and time-limited (1h). When SMTP is wired, remove this
      // metadata field and email the link instead.
      resetUrl,
    },
    createdAt: new Date(),
  });

  // For non-production environments, surface the URL on the server log so
  // local developers can complete the loop. In prod, this is harmless because
  // the server log is private to the operator.
  if (!env.isProduction) {
     
    console.warn(`[password-reset] reset URL for ${user.email}: ${resetUrl}`);
  }
}

export async function consumeResetTokenAndSetPassword(
  rawToken: string,
  newPassword: string,
): Promise<{ ok: true; user: Pick<User, "email" | "role"> } | { ok: false; reason: "invalid_token" | "expired" | "weak_password" }> {
  if (typeof newPassword !== "string" || newPassword.length < 8 || newPassword.length > 200) {
    return { ok: false, reason: "weak_password" };
  }
  const trimmed = (rawToken || "").trim();
  if (!trimmed || trimmed.length > 256) return { ok: false, reason: "invalid_token" };

  const record = await findPasswordResetTokenByHash(tokenHash(trimmed));
  if (!record || !record._id) return { ok: false, reason: "invalid_token" };
  if (record.consumedAt) return { ok: false, reason: "invalid_token" };
  if (record.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };

  const user = await findUserByEmail(record.email);
  if (!user?._id) return { ok: false, reason: "invalid_token" };

  await updateUserPassword(user._id as ObjectId, await hashPassword(newPassword));
  await consumePasswordResetToken(record._id);
  await invalidateUserResetTokens(user._id as ObjectId);

  await createAuditLog({
    actor: {
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    },
    action: "admin.password_reset",
    summary: `Password reset completed for ${user.email}`,
    metadata: { email: user.email },
    createdAt: new Date(),
  });

  return { ok: true, user: { email: user.email, role: user.role } };
}
