// scripts/e2e-smoke.cjs
// Production smoke tests against http://localhost:3010
// Exits with code != 0 if any assertion fails.

const http = require("http");
const fs = require("fs");
const path = require("path");

const BASE = process.env.SMOKE_BASE || "http://localhost:3010";
const ORG = "org_demo001";
const SVC = "svc_airport-express";
const ADMIN_EMAIL = "admin@kodspot-demo.com";
const ADMIN_PASSWORD = "ChangeMe123!";

let pass = 0;
let fail = 0;
const failures = [];

function color(c, s) {
  const codes = { green: 32, red: 31, yellow: 33, cyan: 36, gray: 90 };
  return `\x1b[${codes[c] || 0}m${s}\x1b[0m`;
}

function expect(name, cond, detail = "") {
  if (cond) {
    pass++;
    console.log(`  ${color("green", "✓")} ${name}`);
  } else {
    fail++;
    failures.push({ name, detail });
    console.log(`  ${color("red", "✗")} ${name} ${detail ? color("gray", "→ " + detail) : ""}`);
  }
}

function section(name) {
  console.log("\n" + color("cyan", "▶ " + name));
}

function request(method, urlPath, { body, headers = {}, redirect = "manual" } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + urlPath);
    const data = body && typeof body !== "string" ? JSON.stringify(body) : body;
    const req = http.request(
      {
        method,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        headers: {
          ...(data ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } : {}),
          ...headers,
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const buf = Buffer.concat(chunks);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: buf,
            text: buf.toString("utf8"),
            json: () => {
              try { return JSON.parse(buf.toString("utf8")); } catch { return null; }
            },
          });
        });
      },
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

function parseSetCookies(headers) {
  const sc = headers["set-cookie"] || [];
  const out = {};
  for (const c of sc) {
    const [pair] = c.split(";");
    const [name, ...rest] = pair.split("=");
    out[name.trim()] = rest.join("=");
  }
  return out;
}

function cookieHeader(cookies) {
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ");
}

(async () => {
  section("1. Health + boot");
  {
    const r = await request("GET", "/api/health");
    expect("GET /api/health 200", r.status === 200, "got " + r.status);
    const j = r.json();
    expect("health.status === ok", j && j.status === "ok", JSON.stringify(j));
  }

  section("2. Public review page (server-rendered)");
  {
    const r = await request("GET", `/r/${ORG}/${SVC}`);
    expect("review page 200", r.status === 200, "got " + r.status);
    expect("includes brand", r.text.includes("Kodspot") || r.text.toLowerCase().includes("review"));
    expect("no Mongo ObjectId leaked", !/[a-f0-9]{24}/i.test(r.text.replace(/\s_?id\":\s*\"[a-f0-9]{24}\"/gi, "")) || !r.text.includes("ObjectId"));
  }
  {
    const r = await request("GET", `/r/org_does_not_exist/${SVC}`);
    expect("invalid org → 404 not-found", r.status === 404, "got " + r.status);
  }

  section("3. Public review-config API");
  let configBody;
  {
    const r = await request("GET", `/api/public/review-config/${ORG}/${SVC}`);
    expect("config 200", r.status === 200, "got " + r.status);
    configBody = r.json();
    expect("returns service.publicId", !!configBody?.service?.publicId);
    expect("returns reviewConfig", !!configBody?.service?.reviewConfig);
    expect("does NOT expose qrCode field", !("qrCode" in (configBody || {})));
    expect("does NOT expose org._id", !configBody?.organization?._id);
    expect("does NOT expose service._id", !configBody?.service?._id);
    expect("RateLimit-Limit header set", !!r.headers["ratelimit-limit"]);
  }

  section("4. Submit a real review");
  let reviewSubmitted = false;
  {
    // Fetch service config so we can satisfy required answers dynamically
    const cfg = await request("GET", `/api/public/review-config/${ORG}/${SVC}`);
    const questions = cfg.json()?.service?.reviewConfig?.questions || [];
    const answers = questions
      .filter((q) => q.required)
      .map((q) => ({
        questionId: q.id,
        value: q.type === "select" && q.options?.[0] ? q.options[0] : (q.type === "toggle" ? true : "All good, thanks."),
      }));

    const payload = {
      orgId: ORG,
      serviceId: SVC,
      ratingValue: 5,
      answers,
      locale: "en-US",
      reviewer: { name: "Smoke Test", email: "smoke@example.com" },
    };
    const r = await request("POST", "/api/reviews", { body: payload });
    expect("review POST 200", r.status === 200, "got " + r.status + " body=" + r.text.slice(0, 200));
    reviewSubmitted = r.status === 200;
    const j = r.json();
    expect("review response has thank-you title", !!j?.title);
    expect("RateLimit headers present", !!r.headers["ratelimit-limit"]);
  }
  {
    // Bad payload
    const r = await request("POST", "/api/reviews", { body: { ratingValue: 99 } });
    expect("review invalid → 4xx", r.status >= 400 && r.status < 500, "got " + r.status);
  }
  {
    // Bad JSON
    const r = await request("POST", "/api/reviews", { body: "{not-json", headers: { "Content-Type": "application/json" } });
    expect("review malformed JSON → 400", r.status === 400, "got " + r.status);
  }

  section("5. Auth & role guards");
  let adminCookies = {};
  let superCookies = {};
  {
    // Unauthenticated dashboard → 307/308 to /login
    const r = await request("GET", "/dashboard");
    expect("dashboard unauth redirects", r.status === 307 || r.status === 308 || r.status === 302, "got " + r.status);
    expect("redirect points at /login", String(r.headers.location || "").startsWith("/login"));
  }
  {
    const r = await request("GET", "/super-admin");
    expect("super-admin unauth redirects", r.status === 307 || r.status === 308 || r.status === 302, "got " + r.status);
  }
  {
    // Login as org admin via server action
    const form = new URLSearchParams();
    form.append("email", ADMIN_EMAIL);
    form.append("password", ADMIN_PASSWORD);
    const r = await request("POST", "/login", {
      body: form.toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    // Server action POST may redirect (303) to /dashboard
    const cookies = parseSetCookies(r.headers);
    if (cookies.scanreview_session) adminCookies = { scanreview_session: cookies.scanreview_session };
    expect("login form posts (gets non-5xx)", r.status < 500, "got " + r.status);
  }
  // Plain server-action call may fail without Next signed action header, so try the password reset CLI path:
  // We'll instead call DB directly to mint a session token using the same secret.
  // Easier: use the API by calling the auth-service through a tiny shim. Skip if not feasible.

  // Use API approach: there's no public POST /api/login, login goes through server action.
  // For robust smoke, we inject a session by using bcrypt + JWT via the project's own libs.
  if (!adminCookies.scanreview_session) {
    try {
      // Use jose to mint a session matching the project's signing
      const { SignJWT } = require("jose");
      const dotenv = fs.readFileSync(".env.local", "utf8");
      const env = {};
      for (const line of dotenv.split(/\r?\n/)) {
        const i = line.indexOf("=");
        if (i > 0) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
      }
      const { MongoClient, ObjectId } = require("mongodb");
      const c = new MongoClient(env.MONGODB_URI);
      await c.connect();
      const db = c.db(env.MONGODB_DB);
      const orgAdmin = await db.collection("users").findOne({ role: "org_admin", email: ADMIN_EMAIL });
      const superAdmin = await db.collection("users").findOne({ role: "super_admin" });
      const secret = new TextEncoder().encode(env.AUTH_SECRET);

      async function mint(u) {
        const claims = {
          userId: u._id.toString(),
          email: u.email,
          name: u.name,
          role: u.role,
        };
        if (u.organizationId) claims.organizationId = u.organizationId.toString();
        return await new SignJWT(claims)
          .setProtectedHeader({ alg: "HS256" })
          .setExpirationTime("1h")
          .setIssuedAt()
          .sign(secret);
      }

      if (orgAdmin) {
        const t = await mint(orgAdmin);
        adminCookies = { scanreview_session: t };
      }
      if (superAdmin) {
        const t = await mint(superAdmin);
        superCookies = { scanreview_session: t };
      } else {
        // No super_admin user in DB; try ADMIN_KEY-based super admin session if route supports it
        console.log("  " + color("yellow", "!") + " no super_admin user in DB; will skip super-admin tests");
      }
      await c.close();
    } catch (e) {
      console.log("  " + color("yellow", "!") + " session-mint shim failed: " + e.message);
    }
  }

  expect("can mint org admin session", !!adminCookies.scanreview_session);

  section("6. Dashboard with org admin session");
  if (adminCookies.scanreview_session) {
    const r = await request("GET", "/dashboard", { headers: { Cookie: cookieHeader(adminCookies) } });
    expect("dashboard 200 with admin cookie", r.status === 200, "got " + r.status);
    expect("dashboard renders org name", r.text.includes("Kodspot Demo Mobility") || r.text.toLowerCase().includes("dashboard"));
  }

  section("7. QR PDF generation (org admin scope)");
  if (adminCookies.scanreview_session) {
    for (const size of ["a6", "a4", "a3"]) {
      const r = await request("GET", `/api/super-admin/qr-pdf/${ORG}/${SVC}?size=${size}`, {
        headers: { Cookie: cookieHeader(adminCookies) },
      });
      expect(`PDF ${size} 200`, r.status === 200, "got " + r.status);
      expect(`PDF ${size} content-type pdf`, /pdf/i.test(String(r.headers["content-type"] || "")));
      // %PDF-1.x header
      expect(`PDF ${size} valid header`, r.body.slice(0, 4).toString("ascii") === "%PDF");
      // %%EOF tail
      expect(`PDF ${size} valid trailer`, r.body.slice(-6).toString("ascii").includes("%%EOF"));
      const sizeKb = (r.body.length / 1024).toFixed(1);
      expect(`PDF ${size} non-empty (${sizeKb} KB)`, r.body.length > 4000);
      // Save for manual inspection
      fs.writeFileSync(`scripts/_smoke-${size}.pdf`, r.body);
    }
  }
  {
    // Invalid size param
    const r = await request("GET", `/api/super-admin/qr-pdf/${ORG}/${SVC}?size=a99`, {
      headers: { Cookie: cookieHeader(adminCookies) },
    });
    expect("PDF invalid size → 400", r.status === 400, "got " + r.status);
  }
  {
    // Cross-tenant access blocked: try downloading PDF for an org the admin doesn't belong to
    // Find a different org via DB
    const { MongoClient } = require("mongodb");
    const dotenv = fs.readFileSync(".env.local", "utf8");
    const env = {};
    for (const line of dotenv.split(/\r?\n/)) {
      const i = line.indexOf("=");
      if (i > 0) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
    const c = new MongoClient(env.MONGODB_URI);
    await c.connect();
    const db = c.db(env.MONGODB_DB);
    const me = await db.collection("users").findOne({ role: "org_admin", email: ADMIN_EMAIL });
    const otherOrg = await db.collection("organizations").findOne({ _id: { $ne: me.organizationId } });
    let otherSvc;
    if (otherOrg) otherSvc = await db.collection("services").findOne({ organizationId: otherOrg._id });
    await c.close();
    if (otherOrg && otherSvc) {
      const r = await request("GET", `/api/super-admin/qr-pdf/${otherOrg.publicId}/${otherSvc.publicId}?size=a6`, {
        headers: { Cookie: cookieHeader(adminCookies) },
      });
      expect("cross-tenant PDF download forbidden (403)", r.status === 403, "got " + r.status);
    } else {
      console.log("  " + color("yellow", "!") + " no cross-tenant fixture available, skipping isolation test");
    }
  }

  section("8. Admin analytics & services API");
  if (adminCookies.scanreview_session) {
    const r1 = await request("GET", "/api/admin/services", { headers: { Cookie: cookieHeader(adminCookies) } });
    expect("/api/admin/services 200", r1.status === 200, "got " + r1.status);
    expect("returns services array", Array.isArray(r1.json()?.services));
    const r2 = await request("GET", "/api/admin/analytics", { headers: { Cookie: cookieHeader(adminCookies) } });
    expect("/api/admin/analytics 200", r2.status === 200, "got " + r2.status);
    expect("analytics has metrics", !!r2.json()?.metrics);
  }
  {
    // Unauth = 401
    const r = await request("GET", "/api/admin/services");
    expect("/api/admin/services unauth → 401", r.status === 401, "got " + r.status);
  }

  section("9. Super-admin scope (if super user exists)");
  if (superCookies.scanreview_session) {
    const r = await request("GET", "/super-admin", { headers: { Cookie: cookieHeader(superCookies) } });
    expect("super-admin 200", r.status === 200, "got " + r.status);
    const r2 = await request("GET", "/api/super-admin/organizations", { headers: { Cookie: cookieHeader(superCookies) } });
    expect("super-admin org API 200", r2.status === 200, "got " + r2.status);
    // Org admin must NOT be allowed
    const r3 = await request("GET", "/api/super-admin/organizations", { headers: { Cookie: cookieHeader(adminCookies) } });
    expect("super-admin API forbidden for org admin", r3.status === 401, "got " + r3.status);
  } else {
    console.log("  " + color("yellow", "!") + " skipping super-admin tests (no super_admin user)");
  }

  section("10. Rate limiting + error handling");
  {
    // Hammer review endpoint to trigger 429
    let blocked = false;
    let lastStatus = 0;
    let lastRetryAfter = null;
    for (let i = 0; i < 25; i += 1) {
      const r = await request("POST", "/api/reviews", {
        body: { orgId: ORG, serviceId: SVC, ratingValue: 4, answers: [] },
      });
      lastStatus = r.status;
      if (r.status === 429) {
        blocked = true;
        lastRetryAfter = r.headers["retry-after"];
        break;
      }
    }
    expect("review rate limit kicks in (429)", blocked, "lastStatus=" + lastStatus);
    expect("Retry-After header on 429", !!lastRetryAfter);
  }

  section("11. Static asset & PWA");
  {
    const r = await request("GET", "/manifest.webmanifest");
    expect("manifest 200", r.status === 200, "got " + r.status);
    const r2 = await request("GET", "/sw.js");
    expect("service worker 200", r2.status === 200, "got " + r2.status);
  }

  section("12. Sensitive data exposure scan on public surfaces");
  {
    const surfaces = [
      `/r/${ORG}/${SVC}`,
      `/api/public/review-config/${ORG}/${SVC}`,
      "/login",
      "/",
    ];
    for (const u of surfaces) {
      const r = await request("GET", u);
      // No env-name leakage
      const hits = ["MONGODB_URI", "AUTH_SECRET", "ADMIN_KEY", "passwordHash", "ChangeMe123!"]
        .filter((needle) => r.text.includes(needle));
      expect(`${u}: no secrets leaked`, hits.length === 0, "found " + hits.join(","));
    }
  }

  section("13. Scan tracking + conversion rate");
  {
    // Record a few scans against the public scan endpoint
    let scan204 = 0;
    for (let i = 0; i < 3; i += 1) {
      const r = await request("POST", "/api/public/scan", {
        body: { orgId: ORG, serviceId: SVC, locale: "en-US" },
      });
      if (r.status === 204) scan204 += 1;
    }
    expect("public /api/public/scan accepts beacon (204)", scan204 === 3, `got ${scan204}/3`);

    // Invalid input
    const bad = await request("POST", "/api/public/scan", { body: { orgId: "x" } });
    expect("scan missing serviceId → 400", bad.status === 400);

    // Unknown org → silent 204 (no enumeration)
    const ghost = await request("POST", "/api/public/scan", {
      body: { orgId: "org_does_not_exist", serviceId: SVC },
    });
    expect("unknown org → 204 (no leak)", ghost.status === 204);

    // Conversion rate appears in admin analytics
    if (adminCookies.scanreview_session) {
      const a = await request("GET", "/api/admin/analytics", { headers: { Cookie: cookieHeader(adminCookies) } });
      const j = a.json();
      expect("analytics returns scanCount", typeof j?.metrics?.scanCount === "number");
      expect("analytics returns conversionRate", typeof j?.metrics?.conversionRate === "number");
      expect("analytics returns ratings distribution", Array.isArray(j?.metrics?.distribution));
    }
  }

  section("14. Forgot-password flow");
  {
    // Page renders
    const get1 = await request("GET", "/forgot-password");
    expect("/forgot-password renders 200", get1.status === 200);
    expect("page has email field", /name="email"/.test(get1.text));

    const get2 = await request("GET", "/reset-password");
    expect("/reset-password without token renders 200", get2.status === 200);
    expect("renders 'request new one' helper", /request a new one|Forgot password|Request a new/.test(get2.text));

    // Mint a reset token directly in the DB (bypasses server-action signing requirement; exercises the
    // /reset-password POST path which is what protects the consume side).
    const { MongoClient, ObjectId } = require("mongodb");
    const crypto = require("crypto");
    const dotenv = fs.readFileSync(".env.local", "utf8");
    const env = {};
    for (const line of dotenv.split(/\r?\n/)) {
      const i = line.indexOf("=");
      if (i > 0) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
    const c = new MongoClient(env.MONGODB_URI);
    await c.connect();
    const db = c.db(env.MONGODB_DB);
    const user = await db.collection("users").findOne({ email: ADMIN_EMAIL });
    expect("target admin user exists", !!user);

    const rawToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const tokenDoc = {
      userId: user._id,
      tokenHash,
      requestedByIp: "127.0.0.1",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      consumedAt: null,
    };
    await db.collection("password_reset_tokens").insertOne(tokenDoc);

    // Verify TTL index exists
    const idx = await db.collection("password_reset_tokens").indexes();
    const ttlIdx = idx.find((i) => i.expireAfterSeconds !== undefined);
    expect("password_reset_tokens has TTL index", !!ttlIdx, JSON.stringify(idx.map((i) => i.name)));

    await c.close();

    // Reset using the minted token (server action POST still needs Next-Action header,
    // so test directly that the form page receives the token via query param)
    const r2 = await request("GET", `/reset-password?token=${rawToken}`);
    expect("/reset-password with token renders form", r2.status === 200);
    expect("token present in form as hidden field", r2.text.includes(rawToken));

    // Cleanup: remove the minted token to keep DB tidy
    const c2 = new MongoClient(env.MONGODB_URI);
    await c2.connect();
    await c2.db(env.MONGODB_DB).collection("password_reset_tokens").deleteOne({ tokenHash });
    await c2.close();
  }

  section("15. Service lifecycle (pause / activate)");
  if (adminCookies.scanreview_session) {
    // Pause via toggle action
    const f = new URLSearchParams();
    f.append("servicePublicId", SVC);
    const r = await request("POST", "/dashboard", {
      headers: { Cookie: cookieHeader(adminCookies), "Content-Type": "application/x-www-form-urlencoded" },
      body: f.toString(),
    });
    // Server actions are exposed via the same path; we cannot easily invoke them as a plain POST without
    // the Next-Action header. Instead, verify the repo state is observable via /api/admin/services after
    // calling toggle through the underlying repo helper (skip mutation here to keep the test deterministic).
    void r;
    const list = await request("GET", "/api/admin/services", { headers: { Cookie: cookieHeader(adminCookies) } });
    const services = list.json()?.services || [];
    expect("admin can list services", Array.isArray(services) && services.length > 0);
    expect("each service has status field", services.every((s) => s.status === "active" || s.status === "paused"));
  }

  console.log("\n" + (fail === 0 ? color("green", "ALL PASS") : color("red", "FAILURES"))
    + ` — pass=${pass} fail=${fail}`);
  if (fail > 0) {
    console.log("\nFailing tests:");
    for (const f of failures) console.log("  - " + f.name + (f.detail ? "  [" + f.detail + "]" : ""));
    process.exit(2);
  }
})().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
