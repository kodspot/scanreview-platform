/**
 * One-shot repair: reviews written with corrupted organizationId/serviceId
 * (plain object instead of BSON ObjectId due to unstable_cache JSON round-trip).
 *
 * Usage:
 *   $env:MONGODB_URI="mongodb+srv://..."; node scripts/repair-review-ids.mjs
 */

import { MongoClient, ObjectId } from "mongodb";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse .env.local manually so we don't need the dotenv package
const envFile = resolve(__dirname, "../.env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const idx = line.indexOf("=");
    if (idx > 0 && /^[A-Z_][A-Z0-9_]*$/.test(line.slice(0, idx))) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI not set. Add it to .env.local or set the env var.");
  process.exit(1);
}

function tryReconstructObjectId(val) {
  if (val instanceof ObjectId) return val;
  if (typeof val === "string" && /^[0-9a-f]{24}$/i.test(val)) return new ObjectId(val);
  // Next.js unstable_cache serialises ObjectId as { id: { 0:n, 1:n, ... }, _bsontype:'ObjectId' }
  if (val && typeof val === "object") {
    if (val.id && typeof val.id === "object") {
      const bytes = Object.values(val.id);
      if (bytes.length === 12) {
        const hex = Buffer.from(bytes).toString("hex");
        if (/^[0-9a-f]{24}$/i.test(hex)) return new ObjectId(hex);
      }
    }
    // Sometimes it comes out as { buffer: { 0:n,... } }
    if (val.buffer && typeof val.buffer === "object") {
      const bytes = Object.values(val.buffer);
      if (bytes.length === 12) {
        const hex = Buffer.from(bytes).toString("hex");
        if (/^[0-9a-f]{24}$/i.test(hex)) return new ObjectId(hex);
      }
    }
  }
  return null;
}

const client = new MongoClient(MONGODB_URI);
await client.connect();
const db = client.db();
const reviews = db.collection("reviews");

const all = await reviews.find({}).toArray();
console.log(`Total reviews in collection: ${all.length}`);

let fixed = 0;
let alreadyOk = 0;
let skipped = 0;

for (const doc of all) {
  const orgOk = doc.organizationId instanceof ObjectId;
  const svcOk = doc.serviceId instanceof ObjectId;
  if (orgOk && svcOk) { alreadyOk++; continue; }

  const newOrg = tryReconstructObjectId(doc.organizationId);
  const newSvc = tryReconstructObjectId(doc.serviceId);

  if (!newOrg || !newSvc) {
    console.warn(`  [skip] _id=${doc._id}  orgId=${JSON.stringify(doc.organizationId)}  svcId=${JSON.stringify(doc.serviceId)}`);
    skipped++;
    continue;
  }

  await reviews.updateOne(
    { _id: doc._id },
    { $set: { organizationId: newOrg, serviceId: newSvc } },
  );
  console.log(`  [fixed] _id=${doc._id}  org=${newOrg.toHexString()} svc=${newSvc.toHexString()}`);
  fixed++;
}

console.log(`\nDone — fixed: ${fixed}  already correct: ${alreadyOk}  skipped: ${skipped}`);
await client.close();
