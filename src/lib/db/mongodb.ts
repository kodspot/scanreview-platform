import { MongoClient, ServerApiVersion, type Collection, type Document } from "mongodb";
import { env, getRequiredEnv } from "@/lib/env";

declare global {
  var __scanreviewMongoClient: MongoClient | undefined;
  var __scanreviewMongoClientPromise: Promise<MongoClient> | undefined;
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

export async function getDatabase() {
  const client = await getMongoClientPromise();

  return client.db(env.mongodbDb);
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
