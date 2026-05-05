import { MongoClient, ServerApiVersion, type Collection, type Document } from "mongodb";
import { env, getRequiredEnv } from "@/lib/env";

declare global {
  var __scanreviewMongoClient: MongoClient | undefined;
  var __scanreviewMongoClientPromise: Promise<MongoClient> | undefined;
  var __scanreviewIndexesPromise: Promise<void> | undefined;
}

function createClient() {
  return new MongoClient(getRequiredEnv("MONGODB_URI"), {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });
}

async function getMongoClientPromise() {
  if (!global.__scanreviewMongoClient) {
    global.__scanreviewMongoClient = createClient();
  }

  if (!global.__scanreviewMongoClientPromise) {
    global.__scanreviewMongoClientPromise = global.__scanreviewMongoClient.connect();
  }

  return global.__scanreviewMongoClientPromise;
}

async function ensureIndexesOnce() {
  if (!global.__scanreviewIndexesPromise) {
    // Lazy import to avoid a circular dependency between mongodb.ts and indexes.ts.
    global.__scanreviewIndexesPromise = (async () => {
      try {
        const { ensureIndexes } = await import("@/lib/db/indexes");
        await ensureIndexes();
      } catch (error) {
        // Reset so the next request can try again.
        global.__scanreviewIndexesPromise = undefined;
        if (process.env.NODE_ENV !== "production") {
          console.warn("[mongodb] ensureIndexes failed:", error);
        }
      }
    })();
  }
  return global.__scanreviewIndexesPromise;
}

export async function getDatabase() {
  const client = await getMongoClientPromise();
  const db = client.db(env.mongodbDb);
  // Fire-and-forget: ensure indexes once per process. Do not block the caller.
  void ensureIndexesOnce();
  return db;
}

export async function getCollection<TDocument extends Document>(name: string) {
  const db = await getDatabase();
  return db.collection<TDocument>(name);
}

export async function pingDatabase() {
  const db = await getDatabase();
  await db.command({ ping: 1 });
}

export type ScanreviewCollection<TDocument extends Document> = Collection<TDocument>;
