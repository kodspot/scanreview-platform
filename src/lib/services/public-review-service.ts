import { unstable_cache } from "next/cache";
import { ObjectId } from "mongodb";
import {
  findOrganizationByPublicId,
  incrementOrganizationUsage,
} from "@/lib/repositories/organizations";
import { findQrCodeByService, findServiceByPublicIds } from "@/lib/repositories/services";
import { createReview } from "@/lib/repositories/reviews";
import { reviewSubmissionSchema, type ReviewSubmissionInput } from "@/lib/validation/review";
import type { Review, ReviewAnswer, ReviewQuestion, Sentiment } from "@/lib/types";
import { hashValue } from "@/lib/utils";

function deriveSentiment(ratingValue: number, maxRating: number, lowRatingThreshold: number): Sentiment {
  if (ratingValue <= lowRatingThreshold) {
    return "negative";
  }

  if (ratingValue >= Math.ceil(maxRating * 0.8)) {
    return "positive";
  }

  return "neutral";
}

function normalizeAnswers(
  answers: ReviewSubmissionInput["answers"],
  questions: ReviewQuestion[],
) {
  const questionMap = new Map(questions.map((question) => [question.id, question]));

  return answers.reduce<ReviewAnswer[]>((accumulator, answer) => {
    const question = questionMap.get(answer.questionId);

    if (!question) {
      return accumulator;
    }

    accumulator.push({
      questionId: question.id,
      label: question.label,
      type: question.type,
      value: answer.value,
    });

    return accumulator;
  }, []);
}

export const getPublicReviewExperience = unstable_cache(
  async (orgId: string, serviceId: string) => {
    const organization = await findOrganizationByPublicId(orgId);

    if (!organization || organization.status === "suspended") {
      return null;
    }

    const service = await findServiceByPublicIds(organization._id as ObjectId, serviceId);

    if (!service || service.status !== "active") {
      return null;
    }

    const qrCode = await findQrCodeByService(service._id as ObjectId);

    return {
      organization,
      service,
      qrCode,
      reviewUrl: `/r/${orgId}/${serviceId}`,
    };
  },
  ["public-review-experience"],
  { revalidate: 120 },
);

export async function submitPublicReview(
  input: ReviewSubmissionInput,
  metadata: { ip?: string; locale?: string },
) {
  const parsedInput = reviewSubmissionSchema.parse(input);
  const experience = await getPublicReviewExperience(parsedInput.orgId, parsedInput.serviceId);

  if (!experience) {
    throw new Error("Service not found");
  }

  const { organization, service, qrCode } = experience;
  const reviewConfig = service.reviewConfig;
  const relevantQuestions =
    parsedInput.ratingValue <= reviewConfig.lowRatingThreshold
      ? [...reviewConfig.questions, ...reviewConfig.conditionalQuestions]
      : reviewConfig.questions;

  for (const question of relevantQuestions) {
    const hasAnswer = parsedInput.answers.some((answer) => answer.questionId === question.id);

    if (question.required && !hasAnswer) {
      throw new Error(`Missing required answer for ${question.label}`);
    }
  }

  const review: Review = {
    organizationId: organization._id as ObjectId,
    serviceId: service._id as ObjectId,
    qrCodeId: qrCode?._id as ObjectId | undefined,
    submittedAt: new Date(),
    ratingValue: parsedInput.ratingValue,
    ratingType: reviewConfig.ratingType,
    sentiment: deriveSentiment(
      parsedInput.ratingValue,
      reviewConfig.maxRating,
      reviewConfig.lowRatingThreshold,
    ),
    answers: normalizeAnswers(parsedInput.answers, relevantQuestions),
    customer: {
      locale: parsedInput.locale || metadata.locale,
      source: "qr",
      deviceFingerprint: parsedInput.fingerprint,
      ipHash: metadata.ip ? hashValue(metadata.ip) : undefined,
      profile: {
        name: parsedInput.reviewer?.name,
        email: parsedInput.reviewer?.email,
        phone: parsedInput.reviewer?.phone,
      },
    },
    flags: {
      requiresAttention: parsedInput.ratingValue <= reviewConfig.lowRatingThreshold,
    },
  };

  await createReview(review);
  await incrementOrganizationUsage(organization._id as ObjectId, {
    reviewCount: 1,
    lastReviewAt: new Date(),
  });

  return {
    thankYouTitle: reviewConfig.thankYouTitle,
    thankYouMessage: reviewConfig.thankYouMessage,
  };
}
