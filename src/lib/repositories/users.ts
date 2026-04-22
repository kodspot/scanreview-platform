import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db/mongodb";
import type { User } from "@/lib/types";

export async function getUsersCollection() {
  return getCollection<User>("users");
}

export async function findUserByEmail(email: string) {
  const collection = await getUsersCollection();
  return collection.findOne({ email: email.toLowerCase() });
}

export async function findUsersByOrganization(organizationId: ObjectId) {
  const collection = await getUsersCollection();
  return collection.find({ organizationId }).sort({ createdAt: -1 }).toArray();
}

export async function createUser(user: Omit<User, "_id">) {
  const collection = await getUsersCollection();
  const result = await collection.insertOne({ ...user, email: user.email.toLowerCase() });
  return result.insertedId;
}

export async function updateUserLastLogin(userId: ObjectId) {
  const collection = await getUsersCollection();

  await collection.updateOne(
    { _id: userId },
    { $set: { lastLoginAt: new Date(), updatedAt: new Date() } },
  );
}
