# Kodspot ScanReview

Kodspot ScanReview is a production-oriented, multi-tenant QR-based review management SaaS starter built with Next.js App Router and MongoDB Atlas. It is designed to stay inside Vercel free-tier boundaries while remaining configurable enough for transport, hospitality, healthcare, and other service businesses.

## Architecture Output

- Architecture diagram and technical reasoning: see `docs/architecture.md`
- Multi-tenant model: super admin, organizations, services, QR codes, reviews
- Config-driven review engine: stars, emoji, numeric, custom questions, conditional low-rating questions
- Print-ready QR poster route: `/qr/{orgId}/{serviceId}/a6`

## Stack Decisions

- Frontend and backend: Next.js App Router with route handlers and server components
- Database: MongoDB Atlas via native MongoDB driver
- Auth: signed JWT cookie sessions for admin and super admin
- Validation: Zod at route and action boundaries
- QR generation: server-side `qrcode` package
- Styling: Tailwind CSS v4 with a custom SaaS dashboard look

## Local Setup

1. Copy `.env.example` to `.env.local`.
2. Fill in `MONGODB_URI`, `MONGODB_DB`, `APP_URL`, and `AUTH_SECRET`.
3. Install packages with `npm install`.
4. Seed demo data with `npm run seed`.
5. Start the app with `npm run dev`.

## Demo Credentials

- Super admin: `superadmin@kodspot.com` / `ChangeMe123!`
- Organization admin: `admin@kodspot-demo.com` / `ChangeMe123!`
- Secondary tenant admin: `admin@harborcare.com` / `ChangeMe123!`

## Demo Routes

- Marketing / overview: `/`
- Login: `/login`
- Public review flow: `/r/org_demo001/svc_airport-express`
- Tenant dashboard: `/dashboard`
- Super admin panel: `/super-admin`
- A6 print poster: `/qr/org_demo001/svc_airport-express/a6`
- Health check: `/api/health`

## API Surface

- `GET /api/public/review-config/:orgId/:serviceId`
- `POST /api/reviews`
- `GET /api/admin/analytics`
- `GET /api/admin/services`
- `GET /api/super-admin/organizations`
- `POST /api/super-admin/organizations`

## Vercel Free Tier Guidance

- Keep analytics queries tenant-scoped and index-backed.
- Prefer server components and SSR for admin surfaces to reduce client bundle size.
- Public review pages are intentionally thin so scan-to-submit stays fast on mobile.
- The in-memory rate limiter is acceptable for local and early-stage use, but for stricter multi-region enforcement you should swap in a Redis-backed adapter.
- Atlas free tier is workable for initial stages, but long-term retention, backups, and higher write throughput will eventually require a paid upgrade.

## Production Notes

- All core collections include tenant keys and index definitions in `src/lib/db/indexes.ts`.
- Review submission is config-driven and does not hardcode any specific vertical.
- Build-time env loading is lazy so the codebase can compile before deployment secrets are injected.
