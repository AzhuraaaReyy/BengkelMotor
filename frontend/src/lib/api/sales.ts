import client from "./client";
import type { ApiResponse, Sale, SaleItem } from "@/types";

export interface CartLineInput {
  item_type: "PRODUCT" | "SERVICE";
  product_id?: number;
  service_id?: number;
  quantity: number;
}

export interface CreateSalePayload {
  customer_id?: number | null;
  items: CartLineInput[];
  discount_amount: number;
}

export interface CheckoutPayload {
  payment_method: "CASH" | "QRIS" | "VA" | "GOPAY";
  paid_amount?: number;
  discount_amount: number;
  is_service?: boolean;
  complaint?: string;
  diagnosis_note?: string;
  motorcycle_type?: string;
}

export interface SalesListResponse {
  data: Sale[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export async function getSalesApi(params?: Record<string, unknown>): Promise<SalesListResponse> {
  const { data } = await client.get("/sales", { params });
  // Laravel 12 returns nested meta structure, flatten it
  const raw = data.data;
  return {
    data: raw.data,
    current_page: raw.meta?.current_page ?? raw.current_page,
    last_page: raw.meta?.last_page ?? raw.last_page,
    per_page: raw.meta?.per_page ?? raw.per_page,
    total: raw.meta?.total ?? raw.total,
  };
}

export async function createSaleApi(payload: CreateSalePayload): Promise<Sale> {
  const { data } = await client.post<ApiResponse<Sale>>("/sales", payload);
  return data.data;
}

export async function getSaleApi(id: number): Promise<Sale> {
  const { data } = await client.get<ApiResponse<Sale>>(`/sales/${id}`);
  return data.data;
}

export async function updateSaleApi(
  id: number,
  payload: Partial<CreateSalePayload>,
): Promise<Sale> {
  const { data } = await client.put<ApiResponse<Sale>>(`/sales/${id}`, payload);
  return data.data;
}

export async function checkoutSaleApi(
  id: number,
  payload: CheckoutPayload,
): Promise<Sale> {
  const { data } = await client.post<ApiResponse<Sale>>(
    `/sales/${id}/checkout`,
    payload,
  );
  return data.data;
}

export async function voidSaleApi(id: number, reason: string): Promise<Sale> {
  const { data } = await client.post<ApiResponse<Sale>>(`/sales/${id}/void`, {
    reason,
  });
  return data.data;
}

export async function getSaleItemsApi(saleId: number): Promise<SaleItem[]> {
  const { data } = await client.get<ApiResponse<SaleItem[]>>(
    `/sales/${saleId}/items`,
  );
  return data.data;
}
