# Kodspot ScanReview Architecture

## 1. Architecture Diagram

```text
                           +-------------------------------+
                           |        Vercel Edge/CDN        |
                           |  Next.js App Router frontend  |
                           +---------------+---------------+
                                           |
                  +------------------------+------------------------+
                  |                                                 |
        +---------v---------+                             +---------v---------+
        | Public Review UX  |                             | Admin / SuperAdmin |
        | /r/{org}/{svc}    |                             | /dashboard         |
        | Mobile-first form |                             | /super-admin       |
        +---------+---------+                             +---------+---------+
                  |                                                 |
                  +------------------------+------------------------+
                                           |
                              +------------v-------------+
                              | Next.js Route Handlers   |
                              | Server Actions / SSR     |
                              | Tenant-aware services    |
                              +------------+-------------+
                                           |
                   +-----------------------+-----------------------+
                   |                                               |
         +---------v---------+                           +---------v---------+
         | Auth / Sessions   |                           | Rate Limiting      |
         | Signed JWT cookie |                           | Best-effort memory |
         | RBAC middleware   |                           | Adapter-ready      |
         +---------+---------+                           +---------+---------+
                   |                                               |
                   +-----------------------+-----------------------+
                                           |
                               +-----------v-----------+
                               | MongoDB Atlas         |
                               | organizations         |
                               | users                 |
                               | services              |
                               | qr_codes              |
                               | reviews               |
                               +-----------------------+
```

## 2. Technical Decisions

### Single Next.js deployment on Vercel

- Best fit for free-tier economics: one deployment hosts marketing, public review flow, admin dashboards, and APIs.
- App Router gives server components, route handlers, caching primitives, and clean separation between SSR dashboards and client-side review submission.
- Avoids a second Node service, separate infra, and duplicated auth concerns.

### MongoDB native driver instead of Mongoose

- Lower overhead in serverless environments and better control over indexes, aggregation pipelines, and payload shape.
- Schema safety is handled with TypeScript + Zod at the boundary.
- Atlas free tier is sufficient for the first version if writes and indexes are disciplined.

### Tenant model

- Each organization is a tenant identified by `organizationId` plus a public route-safe `publicId`.
- Every write model stores `organizationId` so queries stay tenant-scoped.
- Super admin operates globally; org users are restricted through RBAC middleware and filtered queries.

### Auth strategy

- Customer review flow is anonymous and optimized for speed.
- Admin and super admin use signed JWT cookie sessions with role checks.
- This keeps auth in-app and avoids another paid dependency while remaining compatible with a future migration to Auth.js or an external IdP.

### Config-driven review engine

- Services own their own `reviewConfig` document: rating type, thresholds, custom questions, and low-rating conditional questions.
- This prevents vertical-specific hardcoding and makes the same platform reusable for hotels, transport, healthcare, and similar businesses.

### QR and print assets

- QR payload resolves to `/r/{orgId}/{serviceId}` using public IDs, not Mongo object IDs.
- Print-ready A6 layouts are rendered as HTML/CSS with server-side QR generation, which is reliable on Vercel and easy to export to PDF.

### Scalability choices for 1000+ orgs and 1M+ reviews

- Compound indexes on tenant and time-series access patterns.
- Aggregation pipelines for analytics, scoped by tenant and optionally service/date filters.
- Use `unstable_cache` for low-churn reads like org/service config and dashboard snapshots.
- Keep payloads lean and avoid large client bundles on public routes.

### Rate limiting

- Current implementation uses an in-memory limiter as a zero-cost default for local and early-stage deployments.
- For true multi-region enforcement on Vercel, swap the limiter adapter to Upstash Redis free tier without changing route contracts.

## 3. Database Schema

### organizations

```ts
{
  _id: ObjectId,
  publicId: string,
  name: string,
  slug: string,
  industry: string,
  status: "active" | "trial" | "suspended",
  theme: {
    primary: string,
    secondary: string,
    accent: string,
    surface: string,
    text: string
  },
  featureFlags: {
    lowRatingAlerts: boolean,
    customBranding: boolean,
    advancedAnalytics: boolean,
    printableAssets: boolean
  },
  usage: {
    reviewCount: number,
    serviceCount: number,
    qrCount: number,
    lastReviewAt?: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

- `{ publicId: 1 }` unique
- `{ slug: 1 }` unique
- `{ status: 1, createdAt: -1 }`

### users

```ts
{
  _id: ObjectId,
  organizationId?: ObjectId,
  email: string,
  name: string,
  passwordHash: string,
  role: "super_admin" | "org_admin" | "org_manager" | "org_analyst",
  status: "active" | "disabled",
  lastLoginAt?: Date,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

- `{ email: 1 }` unique
- `{ organizationId: 1, role: 1 }`

### services

```ts
{
  _id: ObjectId,
  organizationId: ObjectId,
  publicId: string,
  slug: string,
  name: string,
  category: string,
  status: "active" | "paused",
  reviewConfig: {
    ratingType: "stars" | "emoji" | "numeric",
    maxRating: number,
    lowRatingThreshold: number,
    promptTitle: string,
    promptDescription: string,
    thankYouTitle: string,
    thankYouMessage: string,
    questions: ReviewQuestion[],
    conditionalQuestions: ReviewQuestion[]
  },
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

- `{ organizationId: 1, publicId: 1 }` unique
- `{ organizationId: 1, slug: 1 }`
- `{ organizationId: 1, status: 1 }`

### qr_codes

```ts
{
  _id: ObjectId,
  organizationId: ObjectId,
  serviceId: ObjectId,
  publicId: string,
  shortCode: string,
  targetUrl: string,
  design: {
    label: string,
    variant: "classic" | "minimal" | "bold"
  },
  printTemplateVersion: string,
  downloadCount: number,
  lastDownloadedAt?: Date,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

- `{ organizationId: 1, serviceId: 1 }`
- `{ publicId: 1 }` unique
- `{ shortCode: 1 }` unique

### reviews

```ts
{
  _id: ObjectId,
  organizationId: ObjectId,
  serviceId: ObjectId,
  qrCodeId?: ObjectId,
  submittedAt: Date,
  ratingValue: number,
  ratingType: "stars" | "emoji" | "numeric",
  sentiment: "positive" | "neutral" | "negative",
  answers: Array<{
    questionId: string,
    label: string,
    type: "text" | "textarea" | "select" | "boolean",
    value: string | boolean
  }>,
  customer: {
    locale?: string,
    source: "qr",
    deviceFingerprint?: string,
    ipHash?: string
  },
  flags: {
    requiresAttention: boolean
  }
}
```

Indexes:

- `{ organizationId: 1, submittedAt: -1 }`
- `{ organizationId: 1, serviceId: 1, submittedAt: -1 }`
- `{ organizationId: 1, sentiment: 1, submittedAt: -1 }`
- `{ serviceId: 1, ratingValue: 1 }`

## 4. API Design

### Public

- `GET /api/public/review-config/:orgId/:serviceId`
  Returns tenant theme, service title, and dynamic question config.
- `POST /api/reviews`
  Accepts anonymous review submissions with service + org public IDs.

### Tenant admin

- `GET /api/admin/analytics?serviceId=&from=&to=`
  Returns KPI cards, trend series, recent reviews, and low-rating counts.
- `GET /api/admin/services`
  Returns services for the authenticated organization.

### Super admin

- `GET /api/super-admin/organizations`
  Returns tenant list with usage and feature flags.
- `POST /api/super-admin/organizations`
  Creates a new tenant.

## 5. Folder Structure

```text
src/
  app/
    api/
    dashboard/
    login/
    qr/
    r/
    super-admin/
  components/
  lib/
    analytics/
    auth/
    db/
    repositories/
    services/
    validation/
scripts/
docs/
```

## 6. Step-by-Step Implementation Plan

1. Establish app shell, environment parsing, database access, auth/session model, and tenant-safe repositories.
2. Build the public review experience first because it is the highest-volume path and defines the config-driven data model.
3. Add review ingestion validation, rate limiting, analytics aggregation, and low-rating attention flags.
4. Build the org dashboard with KPI cards, filters, recent reviews, and alert surfacing.
5. Build the super admin overview for tenant inventory, usage monitoring, and feature flag visibility.
6. Add QR print assets and A6 printable layouts.
7. Add seed data, documentation, and deployment guidance for Vercel free tier + MongoDB Atlas.

## 7. Vercel Free Tier Notes

- Keep route handlers lean to avoid serverless duration limits.
- Prefer SSR/server components for dashboards and a tiny client bundle for public review forms.
- Use Mongo aggregations with proper indexes to avoid long-running analytics queries.
- Avoid generating large files on-demand; QR images are small and safe to produce server-side.
- Multi-region consistency is limited with in-memory rate limiting; for stronger guarantees, use a free external Redis adapter.
