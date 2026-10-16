import { db } from "../src/lib/db";
import { AuthorizeNetGateway, merchantConfig } from "../src/lib/payment-gateway";
import { processMerchantNotification, type ProviderNotification } from "../src/lib/commerce-webhooks";

async function main() {
  const [tenantId, transactionId] = process.argv.slice(2);
  if (!tenantId || !transactionId || !/^\d{1,30}$/.test(transactionId)) throw new Error("Usage: npm run commerce:reconcile -- TENANT_ID TRANSACTION_ID");
  const gateway = new AuthorizeNetGateway(merchantConfig(tenantId));
  const notification: ProviderNotification = { notificationId: "reconcile-" + transactionId, eventType: "net.authorize.payment.authcapture.created", payload: { id: transactionId } };
  await processMerchantNotification({ tenantId, gateway, notification, raw: JSON.stringify(notification) });
  console.log("Provider transaction reconciled.");
}
main().catch(() => { console.error("Reconciliation failed. Check merchant configuration and provider transaction association."); process.exitCode = 1; }).finally(() => db.$disconnect());
