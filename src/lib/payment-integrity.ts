/** Pure invariants shared by payment gateway event processing and the ledger. */
export type PaymentReconciliation = {
  amountCents: number;
  currency: string;
  providerPaymentId?: string | null;
};

export function assertPaidAmountMatchesOrder(
  order: Pick<PaymentReconciliation, 'amountCents' | 'currency'>,
  captured: Pick<PaymentReconciliation, 'amountCents' | 'currency'>,
) {
  if (!Number.isSafeInteger(order.amountCents) || order.amountCents <= 0 ||
      !Number.isSafeInteger(captured.amountCents) || captured.amountCents !== order.amountCents ||
      typeof order.currency !== 'string' || !/^[A-Z]{3}$/.test(order.currency) ||
      typeof captured.currency !== 'string' || captured.currency.toUpperCase() !== order.currency) {
    throw new Error('Captured payment amount or currency does not match the immutable order.');
  }
}

export function assertRefundAmounts(input: {
  capturedCents: number;
  previousRefundsCents: number;
  refundCents: number;
}) {
  const { capturedCents, previousRefundsCents, refundCents } = input;
  if (![capturedCents, previousRefundsCents, refundCents].every(Number.isSafeInteger) ||
      capturedCents <= 0 || previousRefundsCents < 0 || refundCents <= 0 ||
      previousRefundsCents > capturedCents || refundCents > capturedCents - previousRefundsCents) {
    throw new Error('Refund exceeds the captured payment or uses an invalid amount.');
  }
  return previousRefundsCents + refundCents;
}

export function assertRefundReplay(existing: { paymentId: string; amountCents: number },
  attempted: { paymentId: string; amountCents: number }) {
  if (existing.paymentId !== attempted.paymentId || existing.amountCents !== attempted.amountCents) {
    throw new Error('A provider refund ID cannot be reused for a different payment or amount.');
  }
}

export function assertPaidOrderNotReopened(status: string) {
  if (status === 'REFUNDED' || status === 'PARTIALLY_REFUNDED') {
    throw new Error('A refunded order cannot be re-opened by a duplicate payment event.');
  }
}
