import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ObjectId } from "mongodb";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { submitPublicReview } from "@/lib/services/public-review-service";
import { findOrganizationByPublicId } from "@/lib/repositories/organizations";
import { findServiceByPublicIds } from "@/lib/repositories/services";
import { recordSubmissionAttempt } from "@/lib/repositories/submission-attempts";
import { hashValue } from "@/lib/utils";
import type { ReviewSubmissionInput } from "@/lib/validation/review";
import type { ReviewSubmissionOutcome } from "@/lib/types";

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

interface RawSubmission {
  orgId?: unknown;
  serviceId?: unknown;
  ratingValue?: unknown;
}

async function logAttempt(args: {
  outcome: ReviewSubmissionOutcome;
  reason?: string;
  ipHash?: string;
  userAgentHash?: string;
  body: RawSubmission | null;
  ratingValue?: number;
}) {
  const { outcome, reason, ipHash, userAgentHash, body, ratingValue } = args;
  const orgPublicId = typeof body?.orgId === "string" ? body.orgId : undefined;
  const servicePublicId = typeof body?.serviceId === "string" ? body.serviceId : undefined;

  let organizationId: ObjectId | undefined;
  let serviceId: ObjectId | undefined;
  if (orgPublicId) {
    try {
      const org = await findOrganizationByPublicId(orgPublicId);
      if (org?._id) {
        organizationId = org._id as ObjectId;
        if (servicePublicId) {
          const service = await findServiceByPublicIds(organizationId, servicePublicId);
          if (service?._id) serviceId = service._id as ObjectId;
        }
      }
    } catch {
      // ignore — telemetry must never throw
    }
  }

  await recordSubmissionAttempt({
    organizationId,
    serviceId,
    orgPublicId,
    servicePublicId,
    attemptedAt: new Date(),
    outcome,
    ratingValue: typeof ratingValue === "number" ? ratingValue : undefined,
    reason,
    ipHash,
    userAgentHash,
  });
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const ipHash = ip !== "unknown" ? hashValue(ip) : undefined;
  const userAgentHash = (() => {
    const ua = request.headers.get("user-agent");
    return ua ? hashValue(ua) : undefined;
  })();
  const limiter = checkRateLimit(`review:${ip}`, 15, 60_000);
  const headers = rateLimitHeaders(limiter);

  if (!limiter.allowed) {
    await logAttempt({
      outcome: "rate_limited",
      reason: "Rate limit exceeded",
      ipHash,
      userAgentHash,
      body: null,
    });
    return NextResponse.json(
      { message: "Too many submissions. Please wait a minute and try again." },
      { status: 429, headers },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    await logAttempt({ outcome: "invalid_json", reason: "Body was not valid JSON", ipHash, userAgentHash, body: null });
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400, headers });
  }

  const raw = body as RawSubmission;
  const ratingValue = typeof raw?.ratingValue === "number" ? raw.ratingValue : undefined;

  try {
    const response = await submitPublicReview(body as ReviewSubmissionInput, {
      ip,
      locale: request.headers.get("accept-language")?.split(",")[0],
    });
    await logAttempt({ outcome: "success", ipHash, userAgentHash, body: raw, ratingValue });
    return NextResponse.json(
      { title: response.thankYouTitle, message: response.thankYouMessage },
      { headers },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      const reason = error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ");
      console.warn("[review.invalid]", reason);
      await logAttempt({
        outcome: "validation_failed",
        reason,
        ipHash,
        userAgentHash,
        body: raw,
        ratingValue,
      });
      return NextResponse.json(
        { message: "Invalid review submission", issues: error.issues },
        { status: 400, headers },
      );
    }

    const message = error instanceof Error ? error.message : "Unable to submit review";
    const isMissing = message.startsWith("Missing required answer");
    const isNotFound = message === "Service not found";
    const status = isNotFound ? 404 : 400;
    console.warn("[review.failed]", message);
    await logAttempt({
      outcome: isMissing ? "missing_required" : isNotFound ? "service_not_found" : "error",
      reason: message,
      ipHash,
      userAgentHash,
      body: raw,
      ratingValue,
    });
    return NextResponse.json({ message }, { status, headers });
  }
}
