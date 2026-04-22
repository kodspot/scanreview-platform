import type { ObjectId } from "mongodb";

export type UserRole =
  | "super_admin"
  | "org_admin"
  | "org_manager"
  | "org_analyst";

export type OrganizationStatus = "active" | "trial" | "suspended";
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
  createdAt: Date;
  updatedAt: Date;
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
