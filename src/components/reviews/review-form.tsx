"use client";

import { useMemo, useState } from "react";
import { RatingInput } from "@/components/reviews/rating-input";
import type { OrganizationTheme, ReviewConfig, ReviewQuestion } from "@/lib/types";

interface ReviewFormProps {
  orgId: string;
  serviceId: string;
  reviewConfig: ReviewConfig;
  organizationName: string;
  serviceName: string;
  theme: OrganizationTheme;
}

type SubmissionState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; title: string; message: string }
  | { status: "error"; message: string };

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: ReviewQuestion;
  value: string | boolean | undefined;
  onChange: (questionId: string, nextValue: string | boolean) => void;
}) {
  if (question.type === "boolean") {
    return (
      <label className="flex items-center justify-between rounded-[22px] border border-black/10 bg-white px-4 py-3 text-sm text-slate-700">
        <span>{question.label}</span>
        <input
          checked={Boolean(value)}
          className="h-4 w-4"
          onChange={(event) => onChange(question.id, event.target.checked)}
          type="checkbox"
        />
      </label>
    );
  }

  if (question.type === "select") {
    return (
      <label className="block text-sm text-slate-700">
        <span className="mb-2 block">{question.label}</span>
        <select
          className="w-full rounded-[20px] border border-black/10 bg-white px-4 py-3 outline-none"
          onChange={(event) => onChange(question.id, event.target.value)}
          value={typeof value === "string" ? value : ""}
        >
          <option value="">Select one</option>
          {question.options?.map((option) => <option key={option}>{option}</option>)}
        </select>
      </label>
    );
  }

  if (question.type === "textarea") {
    return (
      <label className="block text-sm text-slate-700">
        <span className="mb-2 block">{question.label}</span>
        <textarea
          className="min-h-28 w-full rounded-[20px] border border-black/10 bg-white px-4 py-3 outline-none"
          onChange={(event) => onChange(question.id, event.target.value)}
          placeholder={question.placeholder}
          value={typeof value === "string" ? value : ""}
        />
      </label>
    );
  }

  return (
    <label className="block text-sm text-slate-700">
      <span className="mb-2 block">{question.label}</span>
      <input
        className="w-full rounded-[20px] border border-black/10 bg-white px-4 py-3 outline-none"
        onChange={(event) => onChange(question.id, event.target.value)}
        placeholder={question.placeholder}
        type="text"
        value={typeof value === "string" ? value : ""}
      />
    </label>
  );
}

export function ReviewForm({
  orgId,
  serviceId,
  reviewConfig,
  organizationName,
  serviceName,
  theme,
}: ReviewFormProps) {
  const [ratingValue, setRatingValue] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [reviewerPhone, setReviewerPhone] = useState("");
  const [submission, setSubmission] = useState<SubmissionState>({ status: "idle" });

  const questions = useMemo(() => {
    if (ratingValue > 0 && ratingValue <= reviewConfig.lowRatingThreshold) {
      return [...reviewConfig.questions, ...reviewConfig.conditionalQuestions];
    }

    return reviewConfig.questions;
  }, [ratingValue, reviewConfig]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmission({ status: "submitting" });

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orgId,
          serviceId,
          ratingValue,
          locale: navigator.language,
          fingerprint: window.navigator.userAgent.slice(0, 120),
          reviewer: {
            name: reviewerName.trim() || undefined,
            email: reviewerEmail.trim() || undefined,
            phone: reviewerPhone.trim() || undefined,
          },
          answers: Object.entries(answers).map(([questionId, value]) => ({ questionId, value })),
        }),
      });

      const payload = (await response.json()) as { message?: string; title?: string };

      if (!response.ok) {
        throw new Error(payload.message || "Unable to submit review");
      }

      setSubmission({
        status: "success",
        title: payload.title || reviewConfig.thankYouTitle,
        message: payload.message || reviewConfig.thankYouMessage,
      });
    } catch (error) {
      setSubmission({
        status: "error",
        message: error instanceof Error ? error.message : "Review submission failed",
      });
    }
  }

  if (submission.status === "success") {
    return (
      <div className="rounded-[32px] bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{organizationName}</p>
        <h2 className="mt-3 text-3xl font-semibold text-slate-950">{submission.title}</h2>
        <p className="mt-3 text-base text-slate-600">{submission.message}</p>
      </div>
    );
  }

  return (
    <form
      className="rounded-[32px] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:p-8"
      onSubmit={handleSubmit}
      style={{ backgroundColor: theme.surface, color: theme.text }}
    >
      <div className="rounded-[24px] border border-black/10 bg-white/80 p-5">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{organizationName}</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">{reviewConfig.promptTitle}</h1>
        <p className="mt-2 text-base text-slate-600">{serviceName}: {reviewConfig.promptDescription}</p>
      </div>

      <div className="mt-6 space-y-6">
        <div>
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.22em] text-slate-500">Your rating</p>
          <RatingInput
            maxRating={reviewConfig.maxRating}
            onChange={setRatingValue}
            ratingType={reviewConfig.ratingType}
            value={ratingValue}
          />
        </div>

        {questions.map((question) => (
          <QuestionField
            key={question.id}
            onChange={(questionId, nextValue) =>
              setAnswers((current) => ({
                ...current,
                [questionId]: nextValue,
              }))
            }
            question={question}
            value={answers[question.id]}
          />
        ))}

        <div className="rounded-[22px] border border-black/10 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Optional contact details</p>
          <p className="mt-1 text-xs text-slate-500">Share if you want the team to follow up with you.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-slate-700 sm:col-span-2">
              <span className="mb-1.5 block">Your name (optional)</span>
              <input
                className="w-full rounded-[14px] border border-black/10 bg-white px-3 py-2.5 outline-none transition focus:border-slate-900"
                onChange={(event) => setReviewerName(event.target.value)}
                placeholder="Jane Smith"
                type="text"
                value={reviewerName}
              />
            </label>
            <label className="block text-sm text-slate-700">
              <span className="mb-1.5 block">Email (optional)</span>
              <input
                className="w-full rounded-[14px] border border-black/10 bg-white px-3 py-2.5 outline-none transition focus:border-slate-900"
                onChange={(event) => setReviewerEmail(event.target.value)}
                placeholder="name@email.com"
                type="email"
                value={reviewerEmail}
              />
            </label>
            <label className="block text-sm text-slate-700">
              <span className="mb-1.5 block">Phone (optional)</span>
              <input
                className="w-full rounded-[14px] border border-black/10 bg-white px-3 py-2.5 outline-none transition focus:border-slate-900"
                onChange={(event) => setReviewerPhone(event.target.value)}
                placeholder="+91 98XXXXXX12"
                type="text"
                value={reviewerPhone}
              />
            </label>
          </div>
        </div>
      </div>

      {submission.status === "error" ? (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{submission.message}</p>
      ) : null}

      <button
        className="mt-8 w-full rounded-full px-5 py-4 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(15,23,42,0.22)] transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
        disabled={ratingValue === 0 || submission.status === "submitting"}
        style={{ backgroundColor: theme.primary }}
        type="submit"
      >
        {submission.status === "submitting" ? "Sending review..." : "Submit review"}
      </button>
    </form>
  );
}
