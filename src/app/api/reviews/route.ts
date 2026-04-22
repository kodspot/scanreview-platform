import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { submitPublicReview } from "@/lib/services/public-review-service";

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limiter = checkRateLimit(`review:${ip}`, 15, 60_000);

  if (!limiter.allowed) {
    return NextResponse.json(
      { message: "Too many submissions. Please wait a minute and try again." },
      { status: 429 },
    );
  }

  try {
    const input = await request.json();
    const response = await submitPublicReview(input, {
      ip,
      locale: request.headers.get("accept-language")?.split(",")[0],
    });

    return NextResponse.json({ title: response.thankYouTitle, message: response.thankYouMessage });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to submit review",
      },
      { status: 400 },
    );
  }
}
