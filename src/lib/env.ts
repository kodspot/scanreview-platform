type RequiredKey = "MONGODB_URI" | "AUTH_SECRET";

export function getRequiredEnv(name: RequiredKey) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  mongodbUri: process.env.MONGODB_URI,
  mongodbDb: process.env.MONGODB_DB || "scanreview",
  appUrl: process.env.APP_URL || "http://localhost:3000",
  authSecret: process.env.AUTH_SECRET,
};
