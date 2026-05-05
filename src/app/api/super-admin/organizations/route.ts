import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { getSuperAdminSnapshot } from "@/lib/services/dashboard-service";
import { createTenant } from "@/lib/services/organization-service";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

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

  const limiter = checkRateLimit(`org-create:${session.userId}`, 10, 60_000);
  const headers = rateLimitHeaders(limiter);
  if (!limiter.allowed) {
    return NextResponse.json({ message: "Too many requests" }, { status: 429, headers });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400, headers });
  }

  const payload = createOrganizationSchema.safeParse(body);

  if (!payload.success) {
    return NextResponse.json(
      { message: "Invalid payload", errors: payload.error.flatten() },
      { status: 400, headers },
    );
  }

  const organization = await createTenant(payload.data.name, payload.data.industry);
  return NextResponse.json({ organization }, { status: 201, headers });
}
