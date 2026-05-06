import { getCollection } from "@/lib/db/mongodb";
import type { Organization, PasswordResetToken, QrCodeAsset, QrScanEvent, Review, ReviewSubmissionAttempt, Service, User } from "@/lib/types";

export async function ensureIndexes() {
  const organizations = await getCollection<Organization>("organizations");
  const users = await getCollection<User>("users");
  const services = await getCollection<Service>("services");
  const qrCodes = await getCollection<QrCodeAsset>("qr_codes");
  const reviews = await getCollection<Review>("reviews");
  const scans = await getCollection<QrScanEvent>("qr_scans");
  const passwordResets = await getCollection<PasswordResetToken>("password_reset_tokens");
  const submissionAttempts = await getCollection<ReviewSubmissionAttempt>("review_submission_attempts");

  await Promise.all([
    organizations.createIndexes([
      { key: { publicId: 1 }, unique: true },
      { key: { slug: 1 }, unique: true },
      { key: { status: 1, createdAt: -1 } },
    ]),
    users.createIndexes([
      { key: { email: 1 }, unique: true },
      { key: { organizationId: 1, role: 1 } },
    ]),
    services.createIndexes([
      { key: { organizationId: 1, publicId: 1 }, unique: true },
      { key: { organizationId: 1, slug: 1 } },
      { key: { organizationId: 1, status: 1 } },
    ]),
    qrCodes.createIndexes([
      { key: { organizationId: 1, serviceId: 1 } },
      { key: { publicId: 1 }, unique: true },
      { key: { shortCode: 1 }, unique: true },
    ]),
    reviews.createIndexes([
      { key: { organizationId: 1, submittedAt: -1 } },
      { key: { organizationId: 1, serviceId: 1, submittedAt: -1 } },
      { key: { organizationId: 1, sentiment: 1, submittedAt: -1 } },
      { key: { serviceId: 1, ratingValue: 1 } },
    ]),
    scans.createIndexes([
      { key: { organizationId: 1, scannedAt: -1 } },
      { key: { organizationId: 1, serviceId: 1, scannedAt: -1 } },
    ]),
    passwordResets.createIndexes([
      { key: { tokenHash: 1 }, unique: true },
      { key: { userId: 1, createdAt: -1 } },
      // TTL: auto-purge consumed/expired tokens 24h after expiry
      { key: { expiresAt: 1 }, expireAfterSeconds: 60 * 60 * 24 },
    ]),
    submissionAttempts.createIndexes([
      { key: { organizationId: 1, attemptedAt: -1 } },
      { key: { organizationId: 1, outcome: 1, attemptedAt: -1 } },
      // TTL: auto-purge attempt records after 7 days; the dashboard uses the
      // last 24h window, so this is plenty of headroom for diagnostics.
      { key: { attemptedAt: 1 }, expireAfterSeconds: 60 * 60 * 24 * 7 },
    ]),
  ]);
}
