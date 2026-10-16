import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { assertPaidAmountMatchesOrder, assertPaidOrderNotReopened, assertRefundAmounts, assertRefundReplay } from "@/lib/payment-integrity";

async function paymentTransaction<T>(run: (tx: Prisma.TransactionClient) => Promise<T>, tx?: Prisma.TransactionClient) {
  return tx ? run(tx) : db.$transaction(run);
}

export function normalizeCustomerEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function markOrderPaid(input: {
  orderId: string;
  email: string;
  amountCents: number;
  currency: string;
  customerName?: string | null;
  providerCustomerId?: string | null;
  providerTransactionId?: string | null;
}, transaction?: Prisma.TransactionClient) {
  const normalizedEmail = normalizeCustomerEmail(input.email);

  return paymentTransaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${input.orderId} FOR UPDATE`;
    const order = await tx.order.findUnique({
      where: { id: input.orderId },
      include: {
        items: { include: { deliverableAssets: true } },
        payments: true,
      },
    });
    if (!order) throw new Error("Order not found.");
    assertPaidOrderNotReopened(order.status);
    assertPaidAmountMatchesOrder({ amountCents: order.totalCents, currency: order.currency }, input);
    if (order.buyerEmail && normalizeCustomerEmail(order.buyerEmail) !== normalizedEmail) throw new Error("Payment email does not match the order buyer.");
    if (!input.providerTransactionId || (order.providerTransactionId && order.providerTransactionId !== input.providerTransactionId)) throw new Error("Payment transaction does not match the order.");
    if (order.payments.length !== 1) throw new Error("Order must have exactly one payment record.");
    if (order.status === "CANCELED") throw new Error("Canceled order cannot be fulfilled without payment reconciliation.");

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
        providerCustomerId: input.providerCustomerId ?? undefined,
      },
      create: {
        tenantId: order.tenantId,
        email: input.email,
        normalizedEmail,
        name: input.customerName ?? null,
        providerCustomerId: input.providerCustomerId ?? null,
      },
    });

    if (order.status !== "PAID") {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          customerId: customer.id,
          buyerEmail: input.email,
          providerTransactionId: input.providerTransactionId ?? undefined,
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
          providerPaymentId: input.providerTransactionId ?? undefined,
          failureCode: null,
          failureMessage: null,
        },
      });
    }

    for (const item of order.items) {
      const purchaseLicense = await tx.purchaseLicense.upsert({
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

      for (const asset of item.deliverableAssets) {
        await tx.downloadEntitlement.upsert({
          where: {
            purchaseLicenseId_audioAssetId: {
              purchaseLicenseId: purchaseLicense.id,
              audioAssetId: asset.audioAssetId,
            },
          },
          update: {},
          create: {
            tenantId: order.tenantId,
            purchaseLicenseId: purchaseLicense.id,
            audioAssetId: asset.audioAssetId,
            fileNameSnapshot: asset.fileNameSnapshot,
          },
        });
      }
    }

    return tx.order.findUniqueOrThrow({
      where: { id: order.id },
      include: {
        customer: true,
        items: { include: { purchaseLicense: true } },
        payments: true,
      },
    });
  }, transaction);
}

export async function markOrderPaymentFailed(input: {
  orderId: string;
  providerTransactionId?: string | null;
  failureCode?: string | null;
  failureMessage?: string | null;
}, transaction?: Prisma.TransactionClient) {
  return paymentTransaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${input.orderId} FOR UPDATE`;
    const order = await tx.order.findUnique({
      where: { id: input.orderId },
      include: { payments: true },
    });
    if (!order) throw new Error("Order not found.");
    if (["PAID", "PARTIALLY_REFUNDED", "REFUNDED", "CANCELED"].includes(order.status)) return order;

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "PAYMENT_FAILED",
        failedAt: new Date(),
        providerTransactionId: input.providerTransactionId ?? undefined,
      },
    });

    const payment = order.payments[0];
    if (payment) {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          providerPaymentId: input.providerTransactionId ?? undefined,
          failureCode: input.failureCode ?? null,
          failureMessage: input.failureMessage ?? null,
        },
      });
    }

    return tx.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { payments: true },
    });
  }, transaction);
}

export async function recordRefund(input: {
  orderId: string;
  providerRefundId: string;
  amountCents: number;
  reason?: string | null;
}, transaction?: Prisma.TransactionClient) {
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error("Refund amount must be a positive integer.");
  }

  return paymentTransaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${input.orderId} FOR UPDATE`;
    const order = await tx.order.findUnique({
      where: { id: input.orderId },
      include: { payments: { include: { refunds: true } } },
    });
    if (!order) throw new Error("Order not found.");
    const payment = order.payments[0];
    if (!payment) throw new Error("Order payment not found.");

    if (order.status !== "PAID" && order.status !== "PARTIALLY_REFUNDED" && order.status !== "REFUNDED") {
      throw new Error("Only settled payments may be refunded.");
    }
    const existingRefund = await tx.refund.findUnique({
      where: { provider_accountId_providerRefundId: { provider: payment.provider, accountId: payment.providerAccountId ?? "legacy", providerRefundId: input.providerRefundId } },
    });
    if (existingRefund) {
      assertRefundReplay(existingRefund, {
        paymentId: payment.id,
        amountCents: input.amountCents,
      });
    } else {
      const existingTotal = order.payments[0]!.refunds.reduce(
        (total, refund) => total + refund.amountCents, 0,
      );
      assertRefundAmounts({
        capturedCents: payment.amountCents,
        previousRefundsCents: existingTotal,
        refundCents: input.amountCents,
      });
      await tx.refund.create({
        data: {
          paymentId: payment.id,
          provider: payment.provider, accountId: payment.providerAccountId ?? "legacy",
          providerRefundId: input.providerRefundId,
          amountCents: input.amountCents,
          status: "REFUNDED",
          reason: input.reason ?? null,
        },
      });
    }

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

    if (fullRefund) {
      await tx.purchaseLicense.updateMany({
        where: {
          orderId: order.id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          revocationReason: "Order fully refunded.",
        },
      });
    }

    return tx.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { payments: { include: { refunds: true } } },
    });
  }, transaction);
}
