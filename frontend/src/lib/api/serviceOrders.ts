import client from "./client";
import type { ApiResponse, Paginated, ServiceOrder } from "@/types";

export interface ServiceOrderPayload {
  customer_id: number;
  motorcycle_type?: string;
  mechanic_id?: number;
  complaint: string;
  diagnosis_note?: string;
  // Opsional: backend default-nya "Baru" (OPEN). DONE ("Selesai") hanya
  // di-set otomatis saat checkout dibayar — tidak dikirim dari UI.
  status?: "OPEN" | "IN_PROGRESS" | "CANCELLED";
  opened_at?: string;
}

export async function getServiceOrdersApi(params?: Record<string, unknown>) {
  const { data } = await client.get<ApiResponse<Paginated<ServiceOrder>>>(
    "/service-orders",
    { params },
  );
  return data.data;
}

export async function createServiceOrderApi(
  payload: ServiceOrderPayload,
): Promise<ServiceOrder> {
  const { data } = await client.post<ApiResponse<ServiceOrder>>(
    "/service-orders",
    payload,
  );
  return data.data;
}

export async function getServiceOrderApi(id: number): Promise<ServiceOrder> {
  const { data } = await client.get<ApiResponse<ServiceOrder>>(
    `/service-orders/${id}`,
  );
  return data.data;
}

export async function updateServiceOrderApi(
  id: number,
  payload: Partial<ServiceOrderPayload>,
): Promise<ServiceOrder> {
  const { data } = await client.put<ApiResponse<ServiceOrder>>(
    `/service-orders/${id}`,
    payload,
  );
  return data.data;
}

export async function deleteServiceOrderApi(id: number): Promise<void> {
  await client.delete<ApiResponse<null>>(`/service-orders/${id}`);
}
