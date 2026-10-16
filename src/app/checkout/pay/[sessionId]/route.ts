import { getTenantApiAccess } from "@/lib/access";
import { db } from "@/lib/db";
import { decryptHostedToken, hostedCheckoutResponse } from "@/lib/hosted-checkout";
import { getCurrentTenant } from "@/lib/tenant";

export async function GET(_request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const tenant = await getCurrentTenant();
  const { sessionId } = await context.params;
  if (!tenant || !/^[a-f0-9]{64}$/.test(sessionId)) return new Response("Checkout not found.", { status: 404 });
  const session = await db.hostedCheckout.findFirst({ where: { id: sessionId, tenantId: tenant.id } });
  if (!session || session.completedAt || session.expiresAt <= new Date()) {
    return new Response("Checkout expired. Please return to the cart or billing page.", { status: 410, headers: { "Cache-Control": "no-store" } });
  }
  if (session.kind !== "PAYMENT" && !await getTenantApiAccess("tenant.manage")) {
    return new Response("Unauthorized.", { status: 401 });
  }
  return hostedCheckoutResponse({ actionUrl: session.actionUrl, token: decryptHostedToken(session.token, tenant.id) });
}
