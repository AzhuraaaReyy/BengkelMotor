import client from "./client";
import type { ApiResponse, Customer, Paginated } from "@/types";

export interface CustomerPayload {
  name: string;
  phone?: string;
  motorcycle_type?: string;
  notes?: string;
}

export async function getCustomersApi(params?: Record<string, unknown>) {
  const { data } = await client.get<ApiResponse<Paginated<Customer>>>(
    "/customers",
    { params },
  );
  return data.data;
}

export async function createCustomerApi(
  payload: CustomerPayload,
): Promise<Customer> {
  const { data } = await client.post<ApiResponse<Customer>>(
    "/customers",
    payload,
  );
  return data.data;
}

export async function updateCustomerApi(
  id: number,
  payload: Partial<CustomerPayload>,
): Promise<Customer> {
  const { data } = await client.put<ApiResponse<Customer>>(
    `/customers/${id}`,
    payload,
  );
  return data.data;
}
