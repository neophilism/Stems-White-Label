import { readinessResponse } from "@/lib/readiness";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return readinessResponse();
}
