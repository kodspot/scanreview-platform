import { NextResponse } from "next/server";
import { getPublicReviewExperience } from "@/lib/services/public-review-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string; serviceId: string }> },
) {
  const { orgId, serviceId } = await params;
  const experience = await getPublicReviewExperience(orgId, serviceId);

  if (!experience) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    organization: {
      name: experience.organization.name,
      theme: experience.organization.theme,
    },
    service: {
      name: experience.service.name,
      reviewConfig: experience.service.reviewConfig,
    },
    qrCode: experience.qrCode,
  });
}
