import { createHmac, timingSafeEqual } from "node:crypto";

export type MerchantConfig = {
  accountId: string;
  apiLoginId: string;
  transactionKey: string;
  signatureKey: string;
  currency: string;
  mode: "sandbox" | "live";
  underwritingApproved: boolean;
  dashboardUrl?: string;
  onboardingUrl?: string;
};

export type HostedForm = { token: string; actionUrl: string };
export type VerifiedTransaction = {
  id: string;
  reference: string;
  amountCents: number;
  currency: string;
  status: string;
  type: string;
  originalTransactionId: string | null;
  customerId: string | null;
  email: string | null;
  subscriptionId: string | null;
  capturedAt: Date;
};

/** Money movement stays behind this interface; provider objects never enter the ledger. */
export interface PaymentGateway {
  readonly provider: "AUTHORIZE_NET";
  readonly accountId: string;
  readonly supportsSplitSettlement: boolean;
  hostedPayment(input: {
    reference: string; amountCents: number; currency: string; email: string;
    returnUrl: string; cancelUrl: string;
  }): Promise<HostedForm>;
  transaction(id: string): Promise<VerifiedTransaction>;
  verifyWebhook(body: string, signature: string | null): void;
}

export function centsToDecimal(cents: number) {
  if (!Number.isSafeInteger(cents) || cents <= 0) throw new Error("Invalid payment amount.");
  return (BigInt(cents) / 100n).toString() + "." + (BigInt(cents) % 100n).toString().padStart(2, "0");
}

export function decimalToCents(value: unknown) {
  const text = String(value);
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) throw new Error("Invalid provider amount.");
  const [whole, fraction = ""] = text.split(".");
  const cents = BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Provider amount is too large.");
  return Number(cents);
}

export function parseMerchantConfig(value: unknown): MerchantConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Merchant configuration is missing.");
  const c = value as Record<string, unknown>;
  for (const key of ["accountId", "apiLoginId", "transactionKey", "signatureKey", "currency"]) {
    if (typeof c[key] !== "string" || !c[key]) throw new Error("Merchant configuration is incomplete.");
  }
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(String(c.accountId)) ||
      !/^[A-Z]{3}$/.test(String(c.currency)) || !/^[a-fA-F0-9]{128}$/.test(String(c.signatureKey)) ||
      !["sandbox", "live"].includes(String(c.mode)) || typeof c.underwritingApproved !== "boolean") {
    throw new Error("Merchant configuration is invalid.");
  }
  return c as MerchantConfig;
}

export function merchantConfig(tenantId: string): MerchantConfig {
  const entries = JSON.parse(process.env.COMMERCE_MERCHANTS_JSON || "{}");
  const config = parseMerchantConfig(Object.hasOwn(entries, tenantId) ? entries[tenantId] : null);
  assertMerchantEnabled(config);
  return config;
}

export function billingMerchantConfig(): MerchantConfig {
  const config = parseMerchantConfig(JSON.parse(process.env.SAAS_BILLING_MERCHANT_JSON || "null"));
  assertMerchantEnabled(config);
  return config;
}

function assertMerchantEnabled(config: MerchantConfig) {
  if (config.mode === "live" && (!config.underwritingApproved || process.env.LIVE_COMMERCE_ENABLED !== "true")) {
    throw new Error("Live commerce requires approved merchant underwriting and explicit activation.");
  }
}

type ApiResult = {
  messages: { resultCode: string; message?: { code: string; text: string }[] };
};
type TransactionDetails = {
  subscription?: { id?: string }; submitTimeUTC: string;
  transId: string; transactionStatus: string; transactionType: string;
  authAmount?: string | number; settleAmount?: string | number;
  order?: { invoiceNumber?: string }; refTransId?: string;
  customer?: { id?: string; email?: string }; profile?: { customerProfileId?: string };
};

export class AuthorizeNetGateway implements PaymentGateway {
  readonly provider = "AUTHORIZE_NET" as const;
  readonly supportsSplitSettlement = false;
  readonly accountId: string;
  private readonly apiUrl: string;
  readonly hostedOrigin: string;

  constructor(readonly config: MerchantConfig, private readonly transport: typeof fetch = fetch) {
    this.accountId = config.accountId;
    this.apiUrl = config.mode === "live" ? "https://api.authorize.net/xml/v1/request.api" : "https://apitest.authorize.net/xml/v1/request.api";
    this.hostedOrigin = config.mode === "live" ? "https://accept.authorize.net" : "https://test.authorize.net";
  }

  async request<T extends ApiResult>(name: string, fields: Record<string, unknown>): Promise<T> {
    const response = await this.transport(this.apiUrl, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [name]: {
        merchantAuthentication: { name: this.config.apiLoginId, transactionKey: this.config.transactionKey },
        ...fields,
      } }),
      signal: AbortSignal.timeout(15000), redirect: "error", cache: "no-store",
    });
    if (!response.ok) throw new Error("Payment gateway is temporarily unavailable.");
    const data = JSON.parse((await response.text()).replace(/^\uFEFF/, "")) as T;
    if (data.messages?.resultCode !== "Ok") {
      // Provider messages can echo customer data. Retain only the non-secret error code.
      const code = data.messages?.message?.[0]?.code;
      throw new Error("Payment gateway rejected the request" + (/^[A-Z0-9]+$/.test(code || "") ? " (" + code + ")" : "") + ".");
    }
    return data;
  }

  async hostedPayment(input: Parameters<PaymentGateway["hostedPayment"]>[0]) {
    if (input.currency !== this.config.currency) throw new Error("Order currency is not supported by this merchant account.");
    if (!/^[A-Za-z0-9]{1,20}$/.test(input.reference)) throw new Error("Invalid checkout reference.");
    const data = await this.request<ApiResult & { token: string }>("getHostedPaymentPageRequest", {
      transactionRequest: {
        transactionType: "authCaptureTransaction", amount: centsToDecimal(input.amountCents),
        order: { invoiceNumber: input.reference }, customer: { email: input.email },
      },
      hostedPaymentSettings: { setting: [
        { settingName: "hostedPaymentReturnOptions", settingValue: JSON.stringify({ showReceipt: true, url: input.returnUrl, urlText: "Return to your order", cancelUrl: input.cancelUrl }) },
        { settingName: "hostedPaymentCustomerOptions", settingValue: JSON.stringify({ showEmail: true, requiredEmail: true, addPaymentProfile: false }) },
        { settingName: "hostedPaymentPaymentOptions", settingValue: JSON.stringify({ cardCodeRequired: true, showCreditCard: true, showBankAccount: false }) },
      ] },
    });
    if (typeof data.token !== "string" || !data.token) throw new Error("Payment gateway did not return a hosted form.");
    return { token: data.token, actionUrl: this.hostedOrigin + "/payment/payment" };
  }

  async transaction(id: string): Promise<VerifiedTransaction> {
    if (!/^\d{1,30}$/.test(id)) throw new Error("Invalid transaction identifier.");
    const data = await this.request<ApiResult & { transaction: TransactionDetails }>("getTransactionDetailsRequest", { transId: id });
    const t = data.transaction;
    if (!t || String(t.transId) !== id) throw new Error("Provider returned an unrelated transaction.");
    return {
      id, reference: t.order?.invoiceNumber ?? "", amountCents: decimalToCents(t.authAmount ?? t.settleAmount),
      currency: this.config.currency, status: t.transactionStatus, type: t.transactionType,
      originalTransactionId: t.refTransId ?? null,
      subscriptionId: t.subscription?.id ?? null, capturedAt: new Date(t.submitTimeUTC),
      customerId: t.profile?.customerProfileId ?? null, email: t.customer?.email ?? null,
    };
  }

  verifyWebhook(body: string, signature: string | null) {
    if (!signature || !/^sha512=[a-fA-F0-9]{128}$/i.test(signature)) throw new Error("Invalid webhook signature.");
    const expected = createHmac("sha512", Buffer.from(this.config.signatureKey, "hex")).update(body, "utf8").digest();
    if (!timingSafeEqual(expected, Buffer.from(signature.slice(7), "hex"))) throw new Error("Invalid webhook signature.");
  }

  async createCustomer(tenantId: string, email: string) {
    const data = await this.request<ApiResult & { customerProfileId: string }>("createCustomerProfileRequest", {
      profile: { merchantCustomerId: tenantId.slice(-20), description: "STEMS platform subscription", email },
    });
    if (!data.customerProfileId) throw new Error("Provider did not return a customer profile.");
    return data.customerProfileId;
  }

  async hostedCustomerProfile(customerId: string, returnUrl: string) {
    const data = await this.request<ApiResult & { token: string }>("getHostedProfilePageRequest", {
      customerProfileId: customerId,
      hostedProfileSettings: { setting: [
        { settingName: "hostedProfileReturnUrl", settingValue: returnUrl },
        { settingName: "hostedProfileReturnUrlText", settingValue: "Return to billing" },
      ] },
    });
    if (!data.token) throw new Error("Provider did not return a profile form.");
    return { token: data.token, actionUrl: this.hostedOrigin + "/customer/manage" };
  }

  async customerPaymentProfile(customerId: string) {
    const data = await this.request<ApiResult & { profile: { paymentProfiles?: { customerPaymentProfileId: string }[] } }>("getCustomerProfileRequest", { customerProfileId: customerId });
    const profile = data.profile?.paymentProfiles?.[0]?.customerPaymentProfileId;
    if (!profile) throw new Error("Save a payment method with the hosted billing form first.");
    return profile;
  }

  async createSubscription(input: { name: string; customerId: string; paymentProfileId: string; amountCents: number; interval: "days" | "months"; intervalCount: number; startDate: string }) {
    const data = await this.request<ApiResult & { subscriptionId: string }>("ARBCreateSubscriptionRequest", {
      subscription: {
        name: input.name.slice(0, 50), paymentSchedule: {
          interval: { length: input.intervalCount, unit: input.interval }, startDate: input.startDate, totalOccurrences: 9999,
        }, amount: centsToDecimal(input.amountCents),
        profile: { customerProfileId: input.customerId, customerPaymentProfileId: input.paymentProfileId },
      },
    });
    if (!data.subscriptionId) throw new Error("Provider did not return a subscription.");
    return data.subscriptionId;
  }

  async subscription(id: string) {
    const data = await this.request<ApiResult & { status: string }>("ARBGetSubscriptionStatusRequest", { subscriptionId: id });
    if (!data.status) throw new Error("Provider returned an invalid subscription status.");
    return data.status;
  }

  async cancelSubscription(id: string) {
    await this.request("ARBCancelSubscriptionRequest", { subscriptionId: id });
  }
}

export function getPaymentGateway(tenantId: string): PaymentGateway {
  return new AuthorizeNetGateway(merchantConfig(tenantId));
}
