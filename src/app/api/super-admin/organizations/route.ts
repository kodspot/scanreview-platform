import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { getSuperAdminSnapshot } from "@/lib/services/dashboard-service";
import { createTenant } from "@/lib/services/organization-service";

const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  industry: z.string().trim().min(2).max(80),
});

async function requireSuperAdmin() {
  const session = await getSessionUser();
  return session?.role === "super_admin" ? session : null;
}

export async function GET() {
  const session = await requireSuperAdmin();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await getSuperAdminSnapshot());
}

export async function POST(request: Request) {
  const session = await requireSuperAdmin();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = createOrganizationSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const organization = await createTenant(payload.data.name, payload.data.industry);
  return NextResponse.json({ organization }, { status: 201 });
}
