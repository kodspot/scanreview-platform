import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSessionUser } from "@/lib/auth/session";
import { listServicesByOrganization } from "@/lib/repositories/services";

export async function GET() {
  const session = await getSessionUser();

  if (!session?.organizationId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const services = await listServicesByOrganization(new ObjectId(session.organizationId));
  return NextResponse.json({ services });
}
