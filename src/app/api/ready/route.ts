import { readinessResponse } from "@/app/api/health/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return readinessResponse();
}
