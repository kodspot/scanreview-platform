import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getPublicReviewExperience } from "@/lib/services/public-review-service";

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string; serviceId: string }> },
) {
  const ip = getClientIp(request);
  const limiter = checkRateLimit(`review-config:${ip}`, 60, 60_000);
  const headers = rateLimitHeaders(limiter);

  if (!limiter.allowed) {
    return NextResponse.json(
      { message: "Too many requests" },
      { status: 429, headers },
    );
  }

  const { orgId, serviceId } = await params;
  const experience = await getPublicReviewExperience(orgId, serviceId);

  if (!experience) {
    return NextResponse.json({ message: "Not found" }, { status: 404, headers });
  }

  // Intentionally return only public-safe fields. Do NOT echo internal Mongo
  // ObjectIds or QR document internals.
  return NextResponse.json(
    {
      organization: {
        publicId: experience.organization.publicId,
        name: experience.organization.name,
        theme: experience.organization.theme,
      },
      service: {
        publicId: experience.service.publicId,
        name: experience.service.name,
        category: experience.service.category,
        reviewConfig: experience.service.reviewConfig,
      },
    },
    { headers },
  );
}
