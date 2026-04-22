import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getDashboardSnapshot } from "@/lib/services/dashboard-service";

export async function GET(request: Request) {
  const session = await getSessionUser();

  if (!session?.organizationId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filters = {
    serviceId: searchParams.get("serviceId") || undefined,
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
  };

  const snapshot = await getDashboardSnapshot(session.organizationId, filters);
  return NextResponse.json(snapshot);
}
