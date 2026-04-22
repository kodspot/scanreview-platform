import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { findOrganizationByPublicId } from "@/lib/repositories/organizations";
import { createUser, findUsersByOrganization } from "@/lib/repositories/users";
import { hashPassword } from "@/lib/auth/password";

const createAdminSchema = z.object({
  email: z.string().email().toLowerCase(),
  name: z.string().trim().min(2).max(120),
  password: z.string().min(8),
});

async function requireSuperAdmin() {
  const session = await getSessionUser();
  return session?.role === "super_admin" ? session : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const session = await requireSuperAdmin();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await params;
  const organization = await findOrganizationByPublicId(orgId);

  if (!organization) {
    return NextResponse.json({ message: "Organization not found" }, { status: 404 });
  }

  const admins = await findUsersByOrganization(organization._id as ObjectId);

  return NextResponse.json({
    admins: admins.map((admin) => ({
      id: admin._id?.toString(),
      email: admin.email,
      name: admin.name,
      role: admin.role,
      status: admin.status,
      createdAt: admin.createdAt,
    })),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const session = await requireSuperAdmin();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await params;
  const organization = await findOrganizationByPublicId(orgId);

  if (!organization) {
    return NextResponse.json({ message: "Organization not found" }, { status: 404 });
  }

  const payload = createAdminSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      { message: "Invalid payload", errors: payload.error.flatten() },
      { status: 400 },
    );
  }

  const now = new Date();
  const passwordHash = await hashPassword(payload.data.password);

  const userId = await createUser({
    organizationId: organization._id as ObjectId,
    email: payload.data.email,
    name: payload.data.name,
    passwordHash,
    role: "org_admin",
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json(
    {
      admin: {
        id: userId.toString(),
        email: payload.data.email,
        name: payload.data.name,
        role: "org_admin",
        status: "active",
      },
    },
    { status: 201 },
  );
}
