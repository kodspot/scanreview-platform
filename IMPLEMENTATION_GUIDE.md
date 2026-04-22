# ScanReview Implementation Guide

## ✅ Completed Features

### 1. Admin Key Authentication
- Added `ADMIN_KEY` environment variable support
- Superadmin can authenticate using either:
  - Email/Password (existing demo credentials)
  - Admin Key (new provisioning mechanism)
- Login page shows two tabs: "Credentials" and "Admin Key"

**How to use Admin Key:**
1. Set environment variable: `ADMIN_KEY=your-secret-key-here` in Vercel or `.env.local`
2. Go to `/login?mode=admin-key`
3. Paste your admin key and sign in
4. You'll be taken directly to superadmin panel

### 2. Organization & Admin Management API
- **Create Organization**: `POST /api/super-admin/organizations`
  ```json
  {
    "name": "Acme Taxi Services",
    "industry": "Transport"
  }
  ```
  Returns: `publicId` (e.g., `org_abc123def`)

- **Create Organization Admin**: `POST /api/super-admin/organizations/{orgId}/admins`
  ```json
  {
    "email": "admin@acmetaxi.com",
    "name": "John Smith",
    "password": "SecurePassword123!"
  }
  ```

- **List Organization Admins**: `GET /api/super-admin/organizations/{orgId}/admins`

### 3. Workflow Example
```
1. Superadmin signs in with ADMIN_KEY
2. Creates organization via POST /api/super-admin/organizations
3. Gets back organization publicId (e.g., "org_demo123")
4. Creates admin via POST /api/super-admin/organizations/org_demo123/admins
5. New admin can sign in and manage services
6. Admin creates services for review collection
7. Services generate QR codes for customers
```

---

## 🔄 In Progress / Next Phase

### Phase 2: Multi-Format QR Generation (PDF)

**Requirement:**
- Single A6 (105mm × 148mm) - current implementation ✅
- A4 with 4 A6 tiles (2x2 grid, 5mm gaps, 300 DPI) ❌
- A3 with 8 A6 tiles (2x4 grid, 5mm gaps, 300 DPI) ❌
- All as print-ready PDF format ❌

**Implementation Plan:**
1. Replace current PNG/image QR rendering with PDF generation
2. Use `pdfkit` or `puppeteer` library for PDF creation
3. Create new routes:
   - `/qr/[orgId]/[serviceId]/a6/pdf` - Single A6 poster (PDF)
   - `/qr/[orgId]/[serviceId]/a4/pdf` - 4x A6 grid on A4 (PDF)
   - `/qr/[orgId]/[serviceId]/a3/pdf` - 8x A6 grid on A3 (PDF)
4. Maintain organization branding (colors, fonts)
5. Support 300 DPI for professional printing

**Files to Modify:**
- `src/lib/qr/pdf-generator.ts` (new file)
- `src/app/qr/[orgId]/[serviceId]/a4/route.ts` (new route)
- `src/app/qr/[orgId]/[serviceId]/a3/route.ts` (new route)

---

### Phase 3: Branding & UI Improvements

**Button Styling Fixes:**
- All buttons should follow consistent rounded-full design
- Add hover states for interactivity
- Use primary color from organization theme
- Files affected:
  - `src/components/ui/section-card.tsx`
  - `src/components/shell/app-shell.tsx`
  - `src/app/dashboard/page.tsx`
  - `src/app/super-admin/page.tsx`

**Branding Updates:**
- Organization name as primary highlight (larger, bolder)
- Company name as secondary text (smaller, muted)
- Apply to:
  - QR posters (all formats)
  - Dashboard header
  - Email communications
  - Files: `src/components/qr/qr-poster.tsx`, `src/components/shell/app-shell.tsx`

**New UI Components Needed:**
- Modal/Dialog for creating organizations
- Modal for creating admin users
- Loading states and spinners
- Success/error notifications
- Form validation messages

---

## 🚀 Deployment Checklist

### Before Production:
- [ ] Replace demo ADMIN_KEY with strong random value
- [ ] Update demo user passwords (currently `ChangeMe123!`)
- [ ] Restrict MongoDB Atlas network access (remove `0.0.0.0/0`)
- [ ] Enable Vercel analytics and error tracking
- [ ] Set up SSL/TLS certificate for custom domain
- [ ] Configure backup retention on MongoDB Atlas
- [ ] Review and update feature flags per tenant

### Configuration:
```bash
# Generate a strong ADMIN_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to Vercel:
ADMIN_KEY=<generated-value>
```

---

## 📋 Testing Scenarios

### Test Superadmin Flow:
1. Sign in with ADMIN_KEY
2. Create new organization via API or UI
3. Create organization admin
4. Verify admin can sign in
5. Admin creates service
6. Service QR code is functional

### Test Organization Flow:
1. Org admin signs in
2. Creates service with review config
3. Generates QR code
4. Test QR code links to review form
5. Submit review and verify data appears in dashboard

### Test Public Review Flow:
1. Customer scans QR
2. Submits review (star rating + feedback)
3. Review appears in dashboard within seconds
4. Dashboard shows updated metrics

---

## 📚 API Reference

### SuperAdmin Endpoints
```
GET  /api/super-admin/organizations
POST /api/super-admin/organizations
GET  /api/super-admin/organizations/{orgId}/admins
POST /api/super-admin/organizations/{orgId}/admins
```

### Organization Admin Endpoints
```
POST /api/admin/services
GET  /api/admin/analytics
```

### Public Endpoints
```
GET  /api/public/review-config/{orgId}/{serviceId}
POST /api/reviews
GET  /qr/{orgId}/{serviceId}/a6
GET  /qr/{orgId}/{serviceId}/a4
GET  /qr/{orgId}/{serviceId}/a3
```

---

## 🔐 Security Notes

- Admin Key should be 32+ characters, URL-safe random string
- Session tokens expire after 7 days
- All passwords hashed with bcrypt (12 rounds)
- Database user should have read-write only on `scanreview` database
- Network access restricted to Vercel IPs (after setup complete)

---

## 📞 Next Steps

1. **Test Admin Key Auth**: Set `ADMIN_KEY` in `.env.local`, sign in at `/login?mode=admin-key`
2. **Create Test Organization**: Use Postman or curl to POST to `/api/super-admin/organizations`
3. **Create Test Admin**: POST to `/api/super-admin/organizations/{orgId}/admins`
4. **Verify Dashboard**: New admin should see dashboard after first login
5. **Design PDF Generation**: Plan A4/A3 layout with 5mm gaps and 300 DPI

---

**Last Updated:** 2026-04-23  
**Status:** Phase 1 Complete, Phase 2-3 Pending
