import { db } from "@/lib/db";

export function normalizeCustomerEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function markOrderPaid(input: {
  orderId: string;
  email: string;
  customerName?: string | null;
  stripeCustomerId?: string | null;
  stripePaymentIntentId?: string | null;
}) {
  const normalizedEmail = normalizeCustomerEmail(input.email);

  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: input.orderId },
      include: { items: true, payments: true },
    });
    if (!order) throw new Error("Order not found.");

    const customer = await tx.customer.upsert({
      where: {
        tenantId_normalizedEmail: {
          tenantId: order.tenantId,
          normalizedEmail,
        },
      },
      update: {
        email: input.email,
        name: input.customerName ?? undefined,
        stripeCustomerId: input.stripeCustomerId ?? undefined,
      },
      create: {
        tenantId: order.tenantId,
        email: input.email,
        normalizedEmail,
        name: input.customerName ?? null,
        stripeCustomerId: input.stripeCustomerId ?? null,
      },
    });

    if (order.status !== "PAID") {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          customerId: customer.id,
          buyerEmail: input.email,
          stripePaymentIntentId: input.stripePaymentIntentId ?? undefined,
          paidAt: new Date(),
          failedAt: null,
          canceledAt: null,
        },
      });
    } else if (order.customerId !== customer.id || !order.buyerEmail) {
      await tx.order.update({
        where: { id: order.id },
        data: { customerId: customer.id, buyerEmail: input.email },
      });
    }

    const payment = order.payments[0];
    if (payment) {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCEEDED",
          providerPaymentId: input.stripePaymentIntentId ?? undefined,
          failureCode: null,
          failureMessage: null,
        },
      });
    }

    for (const item of order.items) {
      await tx.purchaseLicense.upsert({
        where: { orderItemId: item.id },
        update: {},
        create: {
          tenantId: order.tenantId,
          orderId: order.id,
          orderItemId: item.id,
          customerId: customer.id,
          licenseVersionId: item.licenseVersionId,
          acceptedAt: order.termsAcceptedAt,
          termsTextSnapshot: item.termsTextSnapshot,
        },
      });
    }

    return tx.order.findUniqueOrThrow({
      where: { id: order.id },
      include: {
        customer: true,
        items: { include: { purchaseLicense: true } },
        payments: true,
      },
    });
  });
}

export async function markOrderPaymentFailed(input: {
  orderId: string;
  stripePaymentIntentId?: string | null;
  failureCode?: string | null;
  failureMessage?: string | null;
}) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: input.orderId },
      include: { payments: true },
    });
    if (!order) throw new Error("Order not found.");
    if (order.status === "PAID" || order.status === "REFUNDED") return order;

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "PAYMENT_FAILED",
        failedAt: new Date(),
        stripePaymentIntentId: input.stripePaymentIntentId ?? undefined,
      },
    });

    const payment = order.payments[0];
    if (payment) {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          providerPaymentId: input.stripePaymentIntentId ?? undefined,
          failureCode: input.failureCode ?? null,
          failureMessage: input.failureMessage ?? null,
        },
      });
    }

    return tx.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { payments: true },
    });
  });
}

export async function recordRefund(input: {
  orderId: string;
  providerRefundId: string;
  amountCents: number;
  reason?: string | null;
}) {
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents < 0) {
    throw new Error("Refund amount must be a non-negative integer.");
  }

  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: input.orderId },
      include: { payments: { include: { refunds: true } } },
    });
    if (!order) throw new Error("Order not found.");
    const payment = order.payments[0];
    if (!payment) throw new Error("Order payment not found.");

    await tx.refund.upsert({
      where: { providerRefundId: input.providerRefundId },
      update: { amountCents: input.amountCents, reason: input.reason ?? null },
      create: {
        paymentId: payment.id,
        providerRefundId: input.providerRefundId,
        amountCents: input.amountCents,
        status: "REFUNDED",
        reason: input.reason ?? null,
      },
    });

    const refunds = await tx.refund.findMany({ where: { paymentId: payment.id } });
    const refundedCents = refunds.reduce((sum, refund) => sum + refund.amountCents, 0);
    const fullRefund = refundedCents >= payment.amountCents && payment.amountCents > 0;

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        refundedCents,
        status: fullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
      },
    });

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: fullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
        refundedAt: fullRefund ? new Date() : null,
      },
    });

    return tx.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { payments: { include: { refunds: true } } },
    });
  });
}
