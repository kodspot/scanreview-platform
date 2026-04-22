import { findUserByEmail, updateUserLastLogin } from "@/lib/repositories/users";
import { verifyPassword } from "@/lib/auth/password";
import type { SessionUser } from "@/lib/types";

export async function authenticateUser(email: string, password: string): Promise<SessionUser | null> {
  const user = await findUserByEmail(email);

  if (!user || user.status !== "active") {
    return null;
  }

  const isValid = await verifyPassword(password, user.passwordHash);

  if (!isValid) {
    return null;
  }

  if (user._id) {
    await updateUserLastLogin(user._id);
  }

  return {
    userId: user._id?.toString() || "",
    organizationId: user.organizationId?.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
  };
}
