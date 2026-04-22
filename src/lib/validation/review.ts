import { z } from "zod";

export const reviewAnswerSchema = z.object({
  questionId: z.string().min(1),
  value: z.union([z.string().trim().max(500), z.boolean()]),
});

export const reviewSubmissionSchema = z.object({
  orgId: z.string().min(3),
  serviceId: z.string().min(3),
  ratingValue: z.number().min(1).max(10),
  answers: z.array(reviewAnswerSchema).default([]),
  locale: z.string().trim().max(20).optional(),
  fingerprint: z.string().trim().max(128).optional(),
});

export type ReviewSubmissionInput = z.infer<typeof reviewSubmissionSchema>;
