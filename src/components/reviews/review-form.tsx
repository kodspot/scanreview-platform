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

function RequiredMark() {
  return (
    <span aria-hidden="true" className="ml-1 text-rose-500">
      *
    </span>
  );
}

function QuestionField({
  question,
  value,
  invalid,
  onChange,
}: {
  question: ReviewQuestion;
  value: string | boolean | undefined;
  invalid: boolean;
  onChange: (questionId: string, nextValue: string | boolean) => void;
}) {
  const labelEl = (
    <span className="mb-2 block">
      {question.label}
      {question.required ? <RequiredMark /> : null}
    </span>
  );
  const baseInput = `w-full rounded-[20px] border bg-white px-4 py-3 outline-none transition ${invalid ? "border-rose-400 ring-1 ring-rose-200" : "border-black/10"}`;

  if (question.type === "boolean") {
    return (
      <label className={`flex items-center justify-between rounded-[22px] border bg-white px-4 py-3 text-sm text-slate-700 ${invalid ? "border-rose-400 ring-1 ring-rose-200" : "border-black/10"}`}>
        <span>
          {question.label}
          {question.required ? <RequiredMark /> : null}
        </span>
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
        {labelEl}
        <select
          aria-required={question.required || undefined}
          aria-invalid={invalid || undefined}
          className={baseInput}
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
        {labelEl}
        <textarea
          aria-required={question.required || undefined}
          aria-invalid={invalid || undefined}
          className={`min-h-28 ${baseInput}`}
          onChange={(event) => onChange(question.id, event.target.value)}
          placeholder={question.placeholder}
          value={typeof value === "string" ? value : ""}
        />
      </label>
    );
  }

  return (
    <label className="block text-sm text-slate-700">
      {labelEl}
      <input
        aria-required={question.required || undefined}
        aria-invalid={invalid || undefined}
        className={baseInput}
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
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [submission, setSubmission] = useState<SubmissionState>({ status: "idle" });

  const questions = useMemo(() => {
    if (ratingValue > 0 && ratingValue <= reviewConfig.lowRatingThreshold) {
      return [...reviewConfig.questions, ...reviewConfig.conditionalQuestions];
    }

    return reviewConfig.questions;
  }, [ratingValue, reviewConfig]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Client-side guard: catch missing required answers before round-tripping
    // to the server so customers see exactly which field to fix.
    const missingIds = new Set<string>();
    for (const q of questions) {
      if (!q.required) continue;
      const v = answers[q.id];
      const filled =
        q.type === "boolean"
          ? typeof v === "boolean"
          : typeof v === "string" && v.trim().length > 0;
      if (!filled) missingIds.add(q.id);
    }
    if (missingIds.size > 0) {
      setMissing(missingIds);
      setSubmission({
        status: "error",
        message: `Please answer the required ${missingIds.size === 1 ? "question" : "questions"} marked with *.`,
      });
      // Scroll first invalid field into view.
      const firstId = Array.from(missingIds)[0];
      const el = document.querySelector<HTMLElement>(`[data-question-id="${firstId}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setMissing(new Set());
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
      noValidate
    >
      <fieldset disabled={submission.status === "submitting"} className="contents">
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
          <div key={question.id} data-question-id={question.id}>
            <QuestionField
              invalid={missing.has(question.id)}
              onChange={(questionId, nextValue) => {
                setAnswers((current) => ({
                  ...current,
                  [questionId]: nextValue,
                }));
                if (missing.has(questionId)) {
                  setMissing((prev) => {
                    const next = new Set(prev);
                    next.delete(questionId);
                    return next;
                  });
                }
              }}
              question={question}
              value={answers[question.id]}
            />
          </div>
        ))}

        <div className="rounded-[22px] border border-black/10 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Optional contact details</p>
          <p className="mt-1 text-xs text-slate-500">Share if you want the team to follow up with you.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-slate-700 sm:col-span-2" htmlFor="reviewer-name">
              <span className="mb-1.5 block">Your name (optional)</span>
              <input
                id="reviewer-name"
                className="w-full rounded-[14px] border border-black/10 bg-white px-3 py-2.5 outline-none transition focus:border-slate-900"
                onChange={(event) => setReviewerName(event.target.value)}
                placeholder="Jane Smith"
                type="text"
                autoComplete="name"
                maxLength={120}
                value={reviewerName}
              />
            </label>
            <label className="block text-sm text-slate-700" htmlFor="reviewer-email">
              <span className="mb-1.5 block">Email (optional)</span>
              <input
                id="reviewer-email"
                className="w-full rounded-[14px] border border-black/10 bg-white px-3 py-2.5 outline-none transition focus:border-slate-900"
                onChange={(event) => setReviewerEmail(event.target.value)}
                placeholder="name@email.com"
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={200}
                value={reviewerEmail}
              />
            </label>
            <label className="block text-sm text-slate-700" htmlFor="reviewer-phone">
              <span className="mb-1.5 block">Phone (optional)</span>
              <input
                id="reviewer-phone"
                className="w-full rounded-[14px] border border-black/10 bg-white px-3 py-2.5 outline-none transition focus:border-slate-900"
                onChange={(event) => setReviewerPhone(event.target.value)}
                placeholder="+91 98XXXXXX12"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={32}
                value={reviewerPhone}
              />
            </label>
          </div>
        </div>
      </div>

      {submission.status === "error" ? (
        <div
          role="alert"
          aria-live="assertive"
          className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {submission.message}
        </div>
      ) : null}

      <button
        className="mt-8 w-full rounded-full px-5 py-4 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(15,23,42,0.22)] transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
        disabled={ratingValue === 0 || submission.status === "submitting"}
        style={{ backgroundColor: theme.primary }}
        type="submit"
      >
        {submission.status === "submitting" ? "Sending review..." : "Submit review"}
      </button>
      </fieldset>
    </form>
  );
}
