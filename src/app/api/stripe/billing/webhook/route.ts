import Stripe from "stripe";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import {
  syncStripeSubscription,
} from "@/lib/billing";
import {
  getStripe,
  getStripeBillingWebhookSecret,
} from "@/lib/stripe";
import {
  syncSubscriptionFromCheckoutSession,
} from "@/lib/stripe-billing";

export const runtime = "nodejs";

async function tenantIdForSubscription(subscription: Stripe.Subscription) {
  if (subscription.metadata?.tenantId) {
    return subscription.metadata.tenantId;
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const billing = await db.tenantSubscription.findFirst({
    where: {
      OR: [
        { stripeSubscriptionId: subscription.id },
        { stripeCustomerId: customerId },
      ],
    },
    select: { tenantId: true },
  });

  return billing?.tenantId ?? null;
}

async function processEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription") return;
      const tenantId =
        session.metadata?.tenantId ?? session.client_reference_id;
      if (!tenantId) return;
      await syncSubscriptionFromCheckoutSession(tenantId, session);
      return;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const tenantId = await tenantIdForSubscription(subscription);
      if (!tenantId) return;
      await syncStripeSubscription(tenantId, subscription);
      return;
    }
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    const rawBody = await request.text();
    event = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      getStripeBillingWebhookSecret(),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Invalid Stripe Billing webhook.",
      },
      { status: 400 },
    );
  }

  const duplicate = await db.stripeWebhookEvent.findUnique({
    where: {
      scope_providerEventId: {
        scope: "BILLING",
        providerEventId: event.id,
      },
    },
  });
  if (duplicate) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await processEvent(event);
    await db.stripeWebhookEvent.create({
      data: {
        scope: "BILLING",
        providerEventId: event.id,
        eventType: event.type,
      },
    }).catch(() => undefined);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe Billing webhook processing failed", event.id, error);
    return NextResponse.json(
      { error: "Billing webhook processing failed." },
      { status: 500 },
    );
  }
}
