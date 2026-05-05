// scripts/validate-db.cjs
const { MongoClient } = require("mongodb");
const fs = require("fs");

const raw = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of raw.split(/\r?\n/)) {
  if (!line || line.startsWith("#")) continue;
  const idx = line.indexOf("=");
  if (idx < 0) continue;
  env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
}

(async () => {
  const c = new MongoClient(env.MONGODB_URI);
  await c.connect();
  const db = c.db(env.MONGODB_DB);
  const cols = (await db.listCollections().toArray()).map((x) => x.name);
  console.log("collections:", cols);
  for (const n of ["organizations", "users", "services", "qr_codes", "reviews", "audit_logs"]) {
    try {
      const ct = await db.collection(n).countDocuments();
      console.log(`${n}: ${ct}`);
    } catch (e) {
      console.log(`${n}: err ${e.message}`);
    }
  }
  // Sample org & service for testing
  const org = await db.collection("organizations").findOne({}, { projection: { publicId: 1, name: 1, status: 1 } });
  console.log("sampleOrg:", org);
  if (org) {
    const svc = await db.collection("services").findOne(
      { organizationId: org._id },
      { projection: { publicId: 1, name: 1, status: 1 } },
    );
    console.log("sampleService:", svc);
  }
  // Sample admin user (role = org_admin) - email only
  const admin = await db.collection("users").findOne(
    { role: "org_admin" },
    { projection: { email: 1, role: 1, status: 1 } },
  );
  console.log("sampleAdmin:", admin);
  // Indexes per collection
  for (const n of ["organizations", "users", "services", "qr_codes", "reviews"]) {
    try {
      const idx = await db.collection(n).indexes();
      console.log(`indexes.${n}:`, idx.map((i) => i.name));
    } catch {}
  }
  await c.close();
})().catch((e) => {
  console.error("FAIL", e.message);
  process.exit(1);
});
