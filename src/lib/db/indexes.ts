import { getCollection } from "@/lib/db/mongodb";
import type { Organization, QrCodeAsset, Review, Service, User } from "@/lib/types";

export async function ensureIndexes() {
  const organizations = await getCollection<Organization>("organizations");
  const users = await getCollection<User>("users");
  const services = await getCollection<Service>("services");
  const qrCodes = await getCollection<QrCodeAsset>("qr_codes");
  const reviews = await getCollection<Review>("reviews");

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
  ]);
}
