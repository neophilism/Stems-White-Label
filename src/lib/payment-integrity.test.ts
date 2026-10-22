import assert from 'node:assert/strict';
import test from 'node:test';
import {assertPaidAmountMatchesOrder, assertRefundAmounts, assertRefundReplay,
  assertPaidOrderNotReopened} from './payment-integrity';

test('only exact settled cents and ISO currency match an immutable order', () => {
  assert.doesNotThrow(() => assertPaidAmountMatchesOrder(
    {amountCents: 12500,currency: 'USD'}, {amountCents:12500,currency:'usd'}));
  for (const received of [{amountCents: 12499,currency:'USD'},
    {amountCents:12500,currency:'EUR'}, {amountCents:-1,currency:'USD'},
    {amountCents:12500.5,currency:'USD'}]) {
    assert.throws(() => assertPaidAmountMatchesOrder({amountCents:12500,currency:'USD'},received));
  }
});

test('refund amounts are bounded, nonzero and do not exceed captured funds', () => {
  assert.equal(assertRefundAmounts({capturedCents:12500,previousRefundsCents:2500,refundCents:10000}),12500);
  for (const amount of [0,-1,10001,Infinity,2.3]) {
    assert.throws(() => assertRefundAmounts({capturedCents:12500,previousRefundsCents:2500,refundCents:amount}));
  }
});

test('refund replay must preserve both owning payment and amount', () => {
  assert.doesNotThrow(() => assertRefundReplay({paymentId:'p1',amountCents:25},{paymentId:'p1',amountCents:25}));
  assert.throws(() => assertRefundReplay({paymentId:'p1',amountCents:25},{paymentId:'p2',amountCents:25}));
  assert.throws(() => assertRefundReplay({paymentId:'p1',amountCents:25},{paymentId:'p1',amountCents:30}));
});

test('duplicate paid events cannot restore refunded purchases', () => {
  assert.doesNotThrow(() => assertPaidOrderNotReopened('PAID'));
  assert.throws(() => assertPaidOrderNotReopened('PARTIALLY_REFUNDED'));
  assert.throws(() => assertPaidOrderNotReopened('REFUNDED'));
});
