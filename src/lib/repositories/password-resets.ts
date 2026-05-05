import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db/mongodb";
import type { PasswordResetToken } from "@/lib/types";

export async function getPasswordResetTokensCollection() {
  return getCollection<PasswordResetToken>("password_reset_tokens");
}

export async function createPasswordResetToken(token: Omit<PasswordResetToken, "_id">) {
  const collection = await getPasswordResetTokensCollection();
  await collection.insertOne(token as PasswordResetToken);
}

export async function findPasswordResetTokenByHash(tokenHash: string) {
  const collection = await getPasswordResetTokensCollection();
  return collection.findOne({ tokenHash });
}

export async function consumePasswordResetToken(id: ObjectId) {
  const collection = await getPasswordResetTokensCollection();
  await collection.updateOne({ _id: id }, { $set: { consumedAt: new Date() } });
}

export async function invalidateUserResetTokens(userId: ObjectId) {
  const collection = await getPasswordResetTokensCollection();
  await collection.deleteMany({ userId, consumedAt: { $exists: false } });
}
