/** Extension contract for a verified merchant integration. Never accept a
 * browser assertion that a payment succeeded. Reconcile signed server webhooks
 * against the stored order amount, PKR currency and provider transaction ID. */
export type PaymentProvider = 'jazzcash' | 'easypaisa' | 'payfast' | 'safepay' | 'card';
export interface PaymentAdapter {
  provider: PaymentProvider;
  createPayment(input: { orderId: string; amountPKR: number; idempotencyKey: string; returnUrl: string }): Promise<{ transactionId: string; redirectUrl: string }>;
  verifyWebhook(request: Request): Promise<{ transactionId: string; orderId: string; amountPKR: number; currency: 'PKR'; status: 'paid' | 'failed' | 'pending' }>;
  refund(input: { transactionId: string; amountPKR: number; idempotencyKey: string }): Promise<{ refundId: string; status: 'pending' | 'completed' }>;
}
// Merchant contracts and current official provider documentation are required
// before an adapter can be registered. COD and bank transfer are offline flows.
export const paymentAdapters: Partial<Record<PaymentProvider, PaymentAdapter>> = {};
