import { loadEnvConfig } from "@next/env";
import { ObjectId } from "mongodb";
import { ensureIndexes } from "../src/lib/db/indexes";
import { getDatabase } from "../src/lib/db/mongodb";
import { hashPassword } from "../src/lib/auth/password";
import { createPublicId } from "../src/lib/utils";
import type { Organization, QrCodeAsset, Review, Service, User } from "../src/lib/types";

loadEnvConfig(process.cwd());

async function upsertOrganization(
  organization: Omit<Organization, "_id">,
): Promise<Organization & { _id: ObjectId }> {
  const db = await getDatabase();
  const organizations = db.collection<Organization>("organizations");
  const { createdAt, ...organizationPatch } = organization;

  await organizations.updateOne(
    { publicId: organization.publicId },
    {
      $set: { ...organizationPatch, updatedAt: new Date() },
      $setOnInsert: { createdAt },
    },
    { upsert: true },
  );

  const record = await organizations.findOne({ publicId: organization.publicId });

  if (!record?._id) {
    throw new Error(`Unable to upsert organization ${organization.publicId}`);
  }

  return record as Organization & { _id: ObjectId };
}

async function upsertService(service: Omit<Service, "_id">): Promise<Service & { _id: ObjectId }> {
  const db = await getDatabase();
  const services = db.collection<Service>("services");
  const { createdAt, ...servicePatch } = service;

  await services.updateOne(
    { organizationId: service.organizationId, publicId: service.publicId },
    {
      $set: { ...servicePatch, updatedAt: new Date() },
      $setOnInsert: { createdAt },
    },
    { upsert: true },
  );

  const record = await services.findOne({
    organizationId: service.organizationId,
    publicId: service.publicId,
  });

  if (!record?._id) {
    throw new Error(`Unable to upsert service ${service.publicId}`);
  }

  return record as Service & { _id: ObjectId };
}

async function upsertQrCode(asset: Omit<QrCodeAsset, "_id">) {
  const db = await getDatabase();
  const qrCodes = db.collection<QrCodeAsset>("qr_codes");
  const { createdAt, ...assetPatch } = asset;

  await qrCodes.updateOne(
    { organizationId: asset.organizationId, serviceId: asset.serviceId },
    {
      $set: { ...assetPatch, updatedAt: new Date() },
      $setOnInsert: { createdAt },
    },
    { upsert: true },
  );
}

async function upsertUser(user: Omit<User, "_id">) {
  const db = await getDatabase();
  const users = db.collection<User>("users");
  const { createdAt, ...userPatch } = user;

  await users.updateOne(
    { email: user.email },
    {
      $set: { ...userPatch, updatedAt: new Date() },
      $setOnInsert: { createdAt },
    },
    { upsert: true },
  );
}

async function seedReviews(organizationId: ObjectId, serviceId: ObjectId) {
  const db = await getDatabase();
  const reviews = db.collection<Review>("reviews");
  const count = await reviews.countDocuments({ organizationId });

  if (count > 0) {
    return count;
  }

  const now = Date.now();
  const demoReviews: Review[] = [
    {
      organizationId,
      serviceId,
      submittedAt: new Date(now - 1000 * 60 * 60 * 4),
      ratingValue: 5,
      ratingType: "stars",
      sentiment: "positive",
      answers: [
        {
          questionId: "speed",
          label: "What stood out most?",
          type: "select",
          value: "Driver professionalism",
        },
      ],
      customer: {
        locale: "en-US",
        source: "qr",
      },
      flags: {
        requiresAttention: false,
      },
    },
    {
      organizationId,
      serviceId,
      submittedAt: new Date(now - 1000 * 60 * 60 * 10),
      ratingValue: 2,
      ratingType: "stars",
      sentiment: "negative",
      answers: [
        {
          questionId: "issue",
          label: "What should we fix immediately?",
          type: "textarea",
          value: "Pickup was late and communication was unclear.",
        },
      ],
      customer: {
        locale: "en-US",
        source: "qr",
      },
      flags: {
        requiresAttention: true,
      },
    },
    {
      organizationId,
      serviceId,
      submittedAt: new Date(now - 1000 * 60 * 60 * 22),
      ratingValue: 4,
      ratingType: "stars",
      sentiment: "positive",
      answers: [
        {
          questionId: "comment",
          label: "Anything else to improve?",
          type: "text",
          value: "Vehicle was clean and route was smooth.",
        },
      ],
      customer: {
        locale: "en-US",
        source: "qr",
      },
      flags: {
        requiresAttention: false,
      },
    },
  ];

  await reviews.insertMany(demoReviews);
  return demoReviews.length;
}

async function main() {
  await ensureIndexes();

  const passwordHash = await hashPassword("ChangeMe123!");
  const now = new Date();

  const kodspotDemo = await upsertOrganization({
    publicId: "org_demo001",
    name: "Kodspot Demo Mobility",
    slug: "kodspot-demo-mobility",
    industry: "Transport",
    status: "active",
    theme: {
      primary: "#0f766e",
      secondary: "#f59e0b",
      accent: "#ea580c",
      surface: "#f7f4ea",
      text: "#0f172a",
    },
    featureFlags: {
      lowRatingAlerts: true,
      customBranding: true,
      advancedAnalytics: true,
      printableAssets: true,
    },
    usage: {
      reviewCount: 0,
      serviceCount: 2,
      qrCount: 2,
    },
    createdAt: now,
    updatedAt: now,
  });

  const harborCare = await upsertOrganization({
    publicId: "org_demo002",
    name: "HarborCare Clinics",
    slug: "harborcare-clinics",
    industry: "Healthcare",
    status: "trial",
    theme: {
      primary: "#1d4ed8",
      secondary: "#0ea5e9",
      accent: "#f97316",
      surface: "#eff6ff",
      text: "#0f172a",
    },
    featureFlags: {
      lowRatingAlerts: true,
      customBranding: true,
      advancedAnalytics: false,
      printableAssets: true,
    },
    usage: {
      reviewCount: 0,
      serviceCount: 1,
      qrCount: 1,
    },
    createdAt: now,
    updatedAt: now,
  });

  const airportExpress = await upsertService({
    organizationId: kodspotDemo._id,
    publicId: "svc_airport-express",
    slug: "airport-express",
    name: "Airport Express",
    category: "Airport Transfer",
    status: "active",
    reviewConfig: {
      ratingType: "stars",
      maxRating: 5,
      lowRatingThreshold: 3,
      promptTitle: "How was your ride today?",
      promptDescription: "Share a quick review while the trip is still fresh.",
      thankYouTitle: "Thanks for riding with us",
      thankYouMessage: "Your feedback has been sent directly to the service team.",
      questions: [
        {
          id: "speed",
          label: "What stood out most?",
          type: "select",
          required: true,
          options: ["Driver professionalism", "Vehicle quality", "Timeliness", "Comfort"],
        },
        {
          id: "comment",
          label: "Anything else you want us to know?",
          type: "textarea",
          placeholder: "Optional details",
        },
      ],
      conditionalQuestions: [
        {
          id: "issue",
          label: "What should we fix immediately?",
          type: "textarea",
          required: true,
          placeholder: "Tell us what went wrong",
        },
      ],
    },
    createdAt: now,
    updatedAt: now,
  });

  const hotelConcierge = await upsertService({
    organizationId: kodspotDemo._id,
    publicId: "svc_hotel-concierge",
    slug: "hotel-concierge",
    name: "Hotel Concierge",
    category: "Hospitality",
    status: "active",
    reviewConfig: {
      ratingType: "emoji",
      maxRating: 5,
      lowRatingThreshold: 2,
      promptTitle: "How was your concierge experience?",
      promptDescription: "A fast emoji-based check-in for guest services.",
      thankYouTitle: "Feedback received",
      thankYouMessage: "We use every response to coach the front-desk team.",
      questions: [
        {
          id: "team",
          label: "Team member or desk name",
          type: "text",
          placeholder: "Optional",
        },
      ],
      conditionalQuestions: [
        {
          id: "follow_up",
          label: "Would you like a manager to contact you?",
          type: "boolean",
        },
      ],
    },
    createdAt: now,
    updatedAt: now,
  });

  const clinicReception = await upsertService({
    organizationId: harborCare._id,
    publicId: "svc_reception-desk",
    slug: "reception-desk",
    name: "Reception Desk",
    category: "Patient Experience",
    status: "active",
    reviewConfig: {
      ratingType: "numeric",
      maxRating: 10,
      lowRatingThreshold: 6,
      promptTitle: "How smooth was your check-in?",
      promptDescription: "Rate the reception process in one tap.",
      thankYouTitle: "Thanks for helping us improve care",
      thankYouMessage: "Your feedback was recorded for the clinic operations team.",
      questions: [
        {
          id: "desk",
          label: "Which desk assisted you?",
          type: "text",
          placeholder: "Optional",
        },
      ],
      conditionalQuestions: [
        {
          id: "delay_reason",
          label: "What caused the poor experience?",
          type: "textarea",
          required: true,
          placeholder: "Tell us about wait time, communication, or other issues",
        },
      ],
    },
    createdAt: now,
    updatedAt: now,
  });

  const targetBase = process.env.APP_URL || "http://localhost:3000";

  await Promise.all([
    upsertQrCode({
      organizationId: kodspotDemo._id,
      serviceId: airportExpress._id,
      publicId: createPublicId("qr"),
      shortCode: "airport-express-a6",
      targetUrl: `${targetBase}/r/${kodspotDemo.publicId}/${airportExpress.publicId}`,
      design: {
        label: "A6 poster",
        variant: "bold",
      },
      printTemplateVersion: "a6-v1",
      downloadCount: 0,
      createdAt: now,
      updatedAt: now,
    }),
    upsertQrCode({
      organizationId: kodspotDemo._id,
      serviceId: hotelConcierge._id,
      publicId: createPublicId("qr"),
      shortCode: "hotel-concierge-a6",
      targetUrl: `${targetBase}/r/${kodspotDemo.publicId}/${hotelConcierge.publicId}`,
      design: {
        label: "A6 poster",
        variant: "classic",
      },
      printTemplateVersion: "a6-v1",
      downloadCount: 0,
      createdAt: now,
      updatedAt: now,
    }),
    upsertQrCode({
      organizationId: harborCare._id,
      serviceId: clinicReception._id,
      publicId: createPublicId("qr"),
      shortCode: "clinic-reception-a6",
      targetUrl: `${targetBase}/r/${harborCare.publicId}/${clinicReception.publicId}`,
      design: {
        label: "A6 poster",
        variant: "minimal",
      },
      printTemplateVersion: "a6-v1",
      downloadCount: 0,
      createdAt: now,
      updatedAt: now,
    }),
  ]);

  await Promise.all([
    upsertUser({
      email: "superadmin@kodspot.com",
      name: "Kodspot Platform Admin",
      passwordHash,
      role: "super_admin",
      status: "active",
      createdAt: now,
      updatedAt: now,
    }),
    upsertUser({
      organizationId: kodspotDemo._id,
      email: "admin@kodspot-demo.com",
      name: "Demo Operations Admin",
      passwordHash,
      role: "org_admin",
      status: "active",
      createdAt: now,
      updatedAt: now,
    }),
    upsertUser({
      organizationId: harborCare._id,
      email: "admin@harborcare.com",
      name: "HarborCare Admin",
      passwordHash,
      role: "org_admin",
      status: "active",
      createdAt: now,
      updatedAt: now,
    }),
  ]);

  const demoReviewCount = await seedReviews(kodspotDemo._id, airportExpress._id);

  const db = await getDatabase();
  await db.collection<Organization>("organizations").updateOne(
    { _id: kodspotDemo._id },
    {
      $set: {
        "usage.reviewCount": demoReviewCount,
        "usage.serviceCount": 2,
        "usage.qrCount": 2,
        "usage.lastReviewAt": new Date(),
      },
    },
  );

  console.log("Seed complete");
  console.log("Super admin: superadmin@kodspot.com / ChangeMe123!");
  console.log("Org admin: admin@kodspot-demo.com / ChangeMe123!");
  console.log(`Demo review URL: ${targetBase}/r/org_demo001/svc_airport-express`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
