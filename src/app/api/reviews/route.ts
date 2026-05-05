import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { submitPublicReview } from "@/lib/services/public-review-service";
import type { ReviewSubmissionInput } from "@/lib/validation/review";

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limiter = checkRateLimit(`review:${ip}`, 15, 60_000);
  const headers = rateLimitHeaders(limiter);

  if (!limiter.allowed) {
    return NextResponse.json(
      { message: "Too many submissions. Please wait a minute and try again." },
      { status: 429, headers },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400, headers });
  }

  try {
    const response = await submitPublicReview(body as ReviewSubmissionInput, {
      ip,
      locale: request.headers.get("accept-language")?.split(",")[0],
    });

    return NextResponse.json(
      { title: response.thankYouTitle, message: response.thankYouMessage },
      { headers },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: "Invalid review submission", issues: error.issues },
        { status: 400, headers },
      );
    }

    const message = error instanceof Error ? error.message : "Unable to submit review";
    const status = message === "Service not found" ? 404 : 400;
    return NextResponse.json({ message }, { status, headers });
  }
}
