import client from "./client";

export async function simulatePaymentApi(saleCode: string): Promise<void> {
  await client.post(`/payments/simulate/${saleCode}`);
}