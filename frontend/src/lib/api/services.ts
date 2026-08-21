import client from "./client";
import type { ApiResponse, Paginated, Service } from "@/types";

export interface ServicePayload {
  code: string;
  name: string;
  sale_price: number;
  is_active: boolean;
}

export async function getServicesApi(params?: Record<string, unknown>) {
  const { data } = await client.get<ApiResponse<Paginated<Service>>>(
    "/services",
    { params },
  );
  return data.data;
}

export async function createServiceApi(
  payload: ServicePayload,
): Promise<Service> {
  const { data } = await client.post<ApiResponse<Service>>(
    "/services",
    payload,
  );
  return data.data;
}

export async function updateServiceApi(
  id: number,
  payload: Partial<ServicePayload>,
): Promise<Service> {
  const { data } = await client.put<ApiResponse<Service>>(
    `/services/${id}`,
    payload,
  );
  return data.data;
}
