import Stripe from "stripe";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { markOrderPaid, markOrderPaymentFailed, recordRefund } from "@/lib/payments";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe";

function stringId(value: string | { id: string } | null | undefined) {
  return typeof value === "string" ? value : value?.id ?? null;
}

async function orderIdFromPaymentIntent(paymentIntentId: string | null) {
  if (!paymentIntentId) return null;
  const order = await db.order.findUnique({
    where: { stripePaymentIntentId: paymentIntentId },
    select: { id: true },
  });
  return order?.id ?? null;
}

async function processEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      if (!orderId) return;

      if (session.payment_status !== "paid" && event.type === "checkout.session.completed") {
        return;
      }

      const email = session.customer_details?.email ?? session.customer_email;
      if (!email) throw new Error("Paid checkout session is missing customer email.");

      await markOrderPaid({
        orderId,
        email,
        customerName: session.customer_details?.name ?? null,
        stripeCustomerId: stringId(session.customer),
        stripePaymentIntentId: stringId(session.payment_intent),
      });
      return;
    }

    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      if (!orderId) return;
      await db.order.updateMany({
        where: {
          id: orderId,
          status: { in: ["PENDING", "CHECKOUT_CREATED", "PAYMENT_FAILED"] },
        },
        data: { status: "CANCELED", canceledAt: new Date() },
      });
      return;
    }

    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      if (!orderId) return;
      await markOrderPaymentFailed({
        orderId,
        stripePaymentIntentId: stringId(session.payment_intent),
        failureMessage: "Stripe Checkout reported asynchronous payment failure.",
      });
      return;
    }

    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      const orderId =
        intent.metadata?.orderId ?? (await orderIdFromPaymentIntent(intent.id));
      if (!orderId) return;
      await markOrderPaymentFailed({
        orderId,
        stripePaymentIntentId: intent.id,
        failureCode: intent.last_payment_error?.code ?? null,
        failureMessage: intent.last_payment_error?.message ?? null,
      });
      return;
    }

    case "refund.created":
    case "refund.updated": {
      const refund = event.data.object as Stripe.Refund;
      if (refund.status !== "succeeded") return;
      const paymentIntentId = stringId(refund.payment_intent);
      const orderId = await orderIdFromPaymentIntent(paymentIntentId);
      if (!orderId) return;
      await recordRefund({
        orderId,
        providerRefundId: refund.id,
        amountCents: refund.amount,
        reason: refund.reason ?? null,
      });
      return;
    }
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await request.text();
    event = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      getStripeWebhookSecret(),
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid Stripe webhook." },
      { status: 400 },
    );
  }

  const alreadyProcessed = await db.paymentWebhookEvent.findUnique({
    where: {
      provider_providerEventId: {
        provider: "STRIPE",
        providerEventId: event.id,
      },
    },
  });
  if (alreadyProcessed) return NextResponse.json({ received: true, duplicate: true });

  try {
    await processEvent(event);
    await db.paymentWebhookEvent.create({
      data: {
        provider: "STRIPE",
        providerEventId: event.id,
        eventType: event.type,
      },
    }).catch(() => undefined);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed", event.id, error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
