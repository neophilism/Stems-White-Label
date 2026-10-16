import { NextResponse } from "next/server";
import { AuthorizeNetGateway, merchantConfig } from "@/lib/payment-gateway";
import { parseNotification, processMerchantNotification, readWebhookBody } from "@/lib/commerce-webhooks";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await context.params;
  let gateway: AuthorizeNetGateway;
  let raw: string;
  let notification;
  try {
    gateway = new AuthorizeNetGateway(merchantConfig(tenantId));
    raw = await readWebhookBody(request);
    gateway.verifyWebhook(raw, request.headers.get("x-anet-signature"));
    notification = parseNotification(raw);
  } catch { return NextResponse.json({ error: "Invalid payment notification." }, { status: 400 }); }
  try {
    const result = await processMerchantNotification({ tenantId, gateway, raw, notification });
    return NextResponse.json({ received: true, ...result });
  } catch {
    console.error("Payment notification reconciliation failed", notification.notificationId);
    return NextResponse.json({ error: "Payment reconciliation failed." }, { status: 500 });
  }
}
