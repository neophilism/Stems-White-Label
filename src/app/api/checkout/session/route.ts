import { NextResponse } from "next/server";

import {
  createPendingOrder,
  normalizeBuyerEmail,
  quoteLicenseProducts,
} from "@/lib/checkout";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { getCurrentTenant } from "@/lib/tenant";

export async function POST(request: Request) {
  const tenant = await getCurrentTenant();
  if (!tenant) return NextResponse.json({ error: "Storefront not found." }, { status: 404 });

  const body = await request.json().catch(() => null);

  try {
    const quote = await quoteLicenseProducts(tenant.id, body?.licenseProductIds);
    const acceptedVersionIds = Array.isArray(body?.acceptedLicenseVersionIds)
      ? new Set(body.acceptedLicenseVersionIds.filter((id: unknown): id is string => typeof id === "string"))
      : new Set<string>();

    if (
      acceptedVersionIds.size !== quote.items.length ||
      quote.items.some((item) => !acceptedVersionIds.has(item.licenseVersionId))
    ) {
      return NextResponse.json(
        { error: "License terms changed since review. Please review the current version before checkout." },
        { status: 409 },
      );
    }

    const buyerEmail = normalizeBuyerEmail(body?.buyerEmail);
    const order = await createPendingOrder(
      tenant.id,
      quote,
      body?.termsAccepted === true,
      buyerEmail,
    );

    try {
      const stripe = getStripe();
      const origin = new URL(request.url).origin;
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_creation: "always",
        customer_email: buyerEmail ?? undefined,
        success_url: origin + "/checkout/success?session_id={CHECKOUT_SESSION_ID}",
        cancel_url: origin + "/cart?canceled=1",
        metadata: {
          orderId: order.id,
          tenantId: tenant.id,
        },
        payment_intent_data: {
          receipt_email: buyerEmail ?? undefined,
          metadata: {
            orderId: order.id,
            tenantId: tenant.id,
          },
        },
        line_items: quote.items.map((item) => ({
          quantity: 1,
          price_data: {
            currency: item.currency.toLowerCase(),
            unit_amount: item.priceCents,
            product_data: {
              name: item.workTitle + " — " + item.licenseName,
              description: "License version " + item.licenseVersionNumber,
              metadata: {
                licenseProductId: item.licenseProductId,
                licenseVersionId: item.licenseVersionId,
              },
            },
          },
        })),
      });

      if (!session.url) throw new Error("Stripe did not return a checkout URL.");

      await db.order.update({
        where: { id: order.id },
        data: {
          status: "CHECKOUT_CREATED",
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId:
            typeof session.payment_intent === "string" ? session.payment_intent : undefined,
        },
      });

      return NextResponse.json({ url: session.url, orderId: order.id });
    } catch (stripeError) {
      await db.order.update({
        where: { id: order.id },
        data: { status: "CANCELED", canceledAt: new Date() },
      }).catch(() => undefined);
      throw stripeError;
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to start checkout." },
      { status: 400 },
    );
  }
}
