type RequiredKey = "MONGODB_URI" | "AUTH_SECRET" | "APP_URL";

export function getRequiredEnv(name: RequiredKey) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const n = value ? Number.parseInt(value, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const SECRET_MIN_LENGTH = 32;
if (
  process.env.NODE_ENV === "production" &&
  process.env.AUTH_SECRET &&
  process.env.AUTH_SECRET.length < SECRET_MIN_LENGTH
) {
  throw new Error(
    `AUTH_SECRET must be at least ${SECRET_MIN_LENGTH} characters in production. ` +
      `Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"`,
  );
}

if (
  process.env.NODE_ENV === "production" &&
  process.env.ADMIN_KEY &&
  process.env.ADMIN_KEY.length < SECRET_MIN_LENGTH
) {
  throw new Error(
    `ADMIN_KEY must be at least ${SECRET_MIN_LENGTH} characters in production.`,
  );
}

export const env = {
  mongodbUri: process.env.MONGODB_URI,
  mongodbDb: process.env.MONGODB_DB || "scanreview",
  appUrl: process.env.APP_URL || "http://localhost:3000",
  authSecret: process.env.AUTH_SECRET,
  adminKey: process.env.ADMIN_KEY,
  sessionDurationSeconds: parsePositiveInt(
    process.env.SESSION_DURATION_SECONDS,
    60 * 60 * 24 * 7,
  ),
  isProduction: process.env.NODE_ENV === "production",
};
