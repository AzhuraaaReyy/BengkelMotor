import client from "./client";
import type { ApiResponse, Paginated, Mechanic } from "@/types";

export interface MechanicPayload {
  name: string;
  phone?: string;
  is_active: boolean;
}

export async function getMechanicsApi(params?: Record<string, unknown>) {
  const { data } = await client.get<ApiResponse<Paginated<Mechanic>>>(
    "/mechanics",
    { params },
  );
  return data.data;
}

export async function createMechanicApi(
  payload: MechanicPayload,
): Promise<Mechanic> {
  const { data } = await client.post<ApiResponse<Mechanic>>(
    "/mechanics",
    payload,
  );
  return data.data;
}

export async function updateMechanicApi(
  id: number,
  payload: Partial<MechanicPayload>,
): Promise<Mechanic> {
  const { data } = await client.put<ApiResponse<Mechanic>>(
    `/mechanics/${id}`,
    payload,
  );
  return data.data;
}
