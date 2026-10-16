import { NextResponse } from "next/server";
import { AuthorizeNetGateway, billingMerchantConfig } from "@/lib/payment-gateway";
import { parseNotification, readWebhookBody } from "@/lib/commerce-webhooks";
import { processBillingNotification } from "@/lib/subscription-webhooks";

export const runtime = "nodejs";
export async function POST(request: Request) {
  let gateway: AuthorizeNetGateway;
  let raw: string;
  let notification;
  try {
    gateway = new AuthorizeNetGateway(billingMerchantConfig());
    raw = await readWebhookBody(request);
    gateway.verifyWebhook(raw, request.headers.get("x-anet-signature"));
    notification = parseNotification(raw);
  } catch { return NextResponse.json({ error: "Invalid billing notification." }, { status: 400 }); }
  try {
    return NextResponse.json({ received: true, ...await processBillingNotification({ gateway, raw, notification }) });
  } catch {
    console.error("Billing notification reconciliation failed", notification.notificationId);
    return NextResponse.json({ error: "Billing reconciliation failed." }, { status: 500 });
  }
}
