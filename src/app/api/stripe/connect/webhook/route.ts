import Stripe from "stripe";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import {
  persistTenantCommerceAccount,
  stripeAccountSnapshot,
} from "@/lib/commerce";
import {
  getStripe,
  getStripeConnectWebhookSecret,
} from "@/lib/stripe";

export const runtime = "nodejs";

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
      getStripeConnectWebhookSecret(),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Invalid Stripe Connect webhook.",
      },
      { status: 400 },
    );
  }

  const duplicate = await db.stripeWebhookEvent.findUnique({
    where: {
      scope_providerEventId: {
        scope: "CONNECT",
        providerEventId: event.id,
      },
    },
  });
  if (duplicate) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    if (event.type === "account.updated") {
      const account = event.data.object as Stripe.Account;
      const commerce = await db.tenantCommerce.findUnique({
        where: { stripeAccountId: account.id },
        select: { tenantId: true },
      });

      if (commerce) {
        await persistTenantCommerceAccount(
          commerce.tenantId,
          stripeAccountSnapshot(account),
        );
      }
    }

    await db.stripeWebhookEvent.create({
      data: {
        scope: "CONNECT",
        providerEventId: event.id,
        eventType: event.type,
      },
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe Connect webhook processing failed", event.id, error);
    return NextResponse.json(
      { error: "Connect webhook processing failed." },
      { status: 500 },
    );
  }
}
