import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { findOrganizationByPublicId } from "@/lib/repositories/organizations";
import { findQrCodeByService, findServiceByPublicIds } from "@/lib/repositories/services";
import { recordScan } from "@/lib/repositories/scans";
import { hashValue } from "@/lib/utils";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ScanBody {
  orgId?: string;
  serviceId?: string;
  locale?: string;
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anon";
  const limiter = checkRateLimit(`scan:${ip}`, 60, 60_000);
  const headers = rateLimitHeaders(limiter);
  if (!limiter.allowed) {
    return NextResponse.json({ message: "Rate limit exceeded" }, { status: 429, headers });
  }

  let body: ScanBody;
  try {
    body = (await request.json()) as ScanBody;
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400, headers });
  }

  const orgId = typeof body.orgId === "string" ? body.orgId.trim() : "";
  const serviceId = typeof body.serviceId === "string" ? body.serviceId.trim() : "";
  if (!orgId || !serviceId) {
    return NextResponse.json({ message: "orgId and serviceId required" }, { status: 400, headers });
  }

  const organization = await findOrganizationByPublicId(orgId);
  if (!organization || organization.status === "archived" || organization.status === "suspended") {
    return new NextResponse(null, { status: 204, headers });
  }
  const service = await findServiceByPublicIds(organization._id as ObjectId, serviceId);
  if (!service || service.status !== "active") {
    return new NextResponse(null, { status: 204, headers });
  }

  const qr = await findQrCodeByService(service._id as ObjectId);
  const ua = request.headers.get("user-agent") || "";

  await recordScan({
    organizationId: organization._id as ObjectId,
    serviceId: service._id as ObjectId,
    qrCodeId: qr?._id as ObjectId | undefined,
    scannedAt: new Date(),
    ipHash: ip !== "anon" ? hashValue(ip) : undefined,
    userAgentHash: ua ? hashValue(ua) : undefined,
    locale: typeof body.locale === "string" ? body.locale.slice(0, 16) : undefined,
  });

  return new NextResponse(null, { status: 204, headers });
}
