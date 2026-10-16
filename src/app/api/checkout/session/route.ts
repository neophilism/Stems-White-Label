import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import {
  ANALYTICS_SESSION_COOKIE,
  normalizeAnalyticsSessionId,
  recordSystemAnalyticsEvent,
} from "@/lib/analytics";
import { checkoutReturnOrigin } from "@/lib/checkout-origin";
import {
  assertAcceptedLicenseVersions,
  createPendingOrder,
  normalizeBuyerEmail,
  quoteLicenseProducts,
} from "@/lib/checkout";
import { getTenantCommerceForCheckout } from "@/lib/commerce";
import { db } from "@/lib/db";
import { getPaymentGateway } from "@/lib/payment-gateway";
import { checkoutIdentifiers, encryptHostedToken } from "@/lib/hosted-checkout";
import { getCurrentTenant } from "@/lib/tenant";

export async function POST(request: Request) {
  const tenant = await getCurrentTenant();
  if (!tenant) return NextResponse.json({ error: "Storefront not found." }, { status: 404 });

  const body = await request.json().catch(() => null);

  try {
    const hostHeader = (await headers()).get("host");
    const origin = checkoutReturnOrigin(request.url, hostHeader, process.env.NODE_ENV === "production");
    const quote = await quoteLicenseProducts(tenant.id, body?.licenseProductIds);
    assertAcceptedLicenseVersions(quote, body?.acceptedLicenseVersionIds);

    const buyerEmail = normalizeBuyerEmail(body?.buyerEmail);
    const commerce = await getTenantCommerceForCheckout(
      tenant.id,
      quote.subtotalCents,
    );
    if (!buyerEmail) throw new Error("A buyer email address is required.");
    const gateway = getPaymentGateway(tenant.id);
    if (commerce.provider !== gateway.provider || commerce.providerAccountId !== gateway.accountId) throw new Error("Merchant configuration does not match this storefront.");
    if (commerce.platformFeeCents && !gateway.supportsSplitSettlement) throw new Error("This merchant provider does not support split settlement. Set platform fees to zero before checkout.");
    const identifiers = checkoutIdentifiers();
    const order = await createPendingOrder(
      tenant.id,
      quote,
      body?.termsAccepted === true,
      buyerEmail,
      {
        provider: gateway.provider,
        providerAccountId: commerce.providerAccountId,
        platformFeeCents: commerce.platformFeeCents,
      },
    );

    try {
      const form = await gateway.hostedPayment({
        reference: identifiers.reference, amountCents: order.totalCents, currency: order.currency, email: buyerEmail,
        returnUrl: origin + "/checkout/success?session_id=" + identifiers.id,
        cancelUrl: origin + "/cart?canceled=1",
      });
      await db.$transaction(async tx => {
        await tx.hostedCheckout.create({ data: {
          ...identifiers, tenantId: tenant.id, orderId: order.id, kind: "PAYMENT", provider: gateway.provider,
          accountId: gateway.accountId, token: encryptHostedToken(form.token, tenant.id), actionUrl: form.actionUrl,
          expiresAt: new Date(Date.now() + 14 * 60_000),
        } });
        await tx.order.update({ where: { id: order.id }, data: {
          status: "CHECKOUT_CREATED", providerCheckoutSessionId: identifiers.id,
        } });
      });

      const cookieStore = await cookies();
      const analyticsSession = cookieStore.get(ANALYTICS_SESSION_COOKIE)?.value;
      await recordSystemAnalyticsEvent({
        tenantId: tenant.id,
        type: "CHECKOUT_STARTED",
        orderId: order.id,
        sessionId: analyticsSession
          ? normalizeAnalyticsSessionId(analyticsSession)
          : null,
      }).catch((analyticsError) => {
        console.error("Unable to record checkout analytics", analyticsError);
      });

      return NextResponse.json({ url: origin + "/checkout/pay/" + identifiers.id, orderId: order.id });
    } catch (gatewayError) {
      await db.order.update({
        where: { id: order.id },
        data: { status: "CANCELED", canceledAt: new Date() },
      }).catch(() => undefined);
      throw gatewayError;
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to start checkout." },
      { status: 400 },
    );
  }
}
