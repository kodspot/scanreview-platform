import type { ObjectId } from "mongodb";

export type UserRole =
  | "super_admin"
  | "org_admin"
  | "org_manager"
  | "org_analyst";

export type OrganizationStatus = "active" | "trial" | "suspended" | "archived";
export type ServiceStatus = "active" | "paused";
export type RatingType = "stars" | "emoji" | "numeric";
export type QuestionType = "text" | "textarea" | "select" | "boolean";
export type Sentiment = "positive" | "neutral" | "negative";

export interface OrganizationTheme {
  primary: string;
  secondary: string;
  accent: string;
  surface: string;
  text: string;
}

export interface FeatureFlags {
  lowRatingAlerts: boolean;
  customBranding: boolean;
  advancedAnalytics: boolean;
  printableAssets: boolean;
}

export interface Organization {
  _id?: ObjectId;
  publicId: string;
  name: string;
  slug: string;
  industry: string;
  status: OrganizationStatus;
  theme: OrganizationTheme;
  featureFlags: FeatureFlags;
  usage: {
    reviewCount: number;
    serviceCount: number;
    qrCount: number;
    lastReviewAt?: Date;
  };
  archive?: {
    at: Date;
    byUserId?: string;
    byName?: string;
    previousStatus: Exclude<OrganizationStatus, "archived">;
  };
  createdAt: Date;
  updatedAt: Date;
}

export type AuditActorRole = UserRole;

export interface AuditLog {
  _id?: ObjectId;
  actor: {
    userId: string;
    name: string;
    email: string;
    role: AuditActorRole;
  };
  organizationPublicId?: string;
  action:
    | "organization.created"
    | "organization.archived"
    | "organization.restored"
    | "organization.purged"
    | "admin.created"
    | "admin.password_reset"
    | "admin.password_reset_requested"
    | "service.created"
    | "service.updated"
    | "service.archived"
    | "qr.pdf_downloaded";
  summary: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
  createdAt: Date;
}

export interface User {
  _id?: ObjectId;
  organizationId?: ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  status: "active" | "disabled";
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewQuestion {
  id: string;
  label: string;
  type: QuestionType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

export interface ReviewConfig {
  ratingType: RatingType;
  maxRating: number;
  lowRatingThreshold: number;
  promptTitle: string;
  promptDescription: string;
  thankYouTitle: string;
  thankYouMessage: string;
  questions: ReviewQuestion[];
  conditionalQuestions: ReviewQuestion[];
}

export interface Service {
  _id?: ObjectId;
  organizationId: ObjectId;
  publicId: string;
  slug: string;
  name: string;
  category: string;
  status: ServiceStatus;
  reviewConfig: ReviewConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface QrCodeAsset {
  _id?: ObjectId;
  organizationId: ObjectId;
  serviceId: ObjectId;
  publicId: string;
  shortCode: string;
  targetUrl: string;
  design: {
    label: string;
    variant: "classic" | "minimal" | "bold";
  };
  printTemplateVersion: string;
  downloadCount: number;
  lastDownloadedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewAnswer {
  questionId: string;
  label: string;
  type: QuestionType;
  value: string | boolean;
}

export interface Review {
  _id?: ObjectId;
  organizationId: ObjectId;
  serviceId: ObjectId;
  qrCodeId?: ObjectId;
  submittedAt: Date;
  ratingValue: number;
  ratingType: RatingType;
  sentiment: Sentiment;
  answers: ReviewAnswer[];
  customer: {
    locale?: string;
    source: "qr";
    deviceFingerprint?: string;
    ipHash?: string;
    profile?: {
      name?: string;
      email?: string;
      phone?: string;
    };
  };
  flags: {
    requiresAttention: boolean;
  };
}

export interface SessionUser {
  userId: string;
  organizationId?: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface DashboardFilters {
  serviceId?: string;
  from?: string;
  to?: string;
}

export interface QrScanEvent {
  _id?: ObjectId;
  organizationId: ObjectId;
  serviceId: ObjectId;
  qrCodeId?: ObjectId;
  scannedAt: Date;
  ipHash?: string;
  userAgentHash?: string;
  locale?: string;
}

export type ReviewSubmissionOutcome = "success" | "validation_failed" | "missing_required" | "rate_limited" | "service_not_found" | "invalid_json" | "error";

export interface ReviewSubmissionAttempt {
  _id?: ObjectId;
  organizationId?: ObjectId;
  serviceId?: ObjectId;
  orgPublicId?: string;
  servicePublicId?: string;
  attemptedAt: Date;
  outcome: ReviewSubmissionOutcome;
  ratingValue?: number;
  reason?: string;
  ipHash?: string;
  userAgentHash?: string;
}

export interface PasswordResetToken {
  _id?: ObjectId;
  userId: ObjectId;
  tokenHash: string;
  email: string;
  expiresAt: Date;
  consumedAt?: Date;
  createdAt: Date;
  requestIpHash?: string;
}
