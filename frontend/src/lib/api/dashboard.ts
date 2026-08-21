import client from "./client";
import type { ApiResponse, DashboardData } from "@/types";

export async function getDashboardApi(params?: {
  from?: string;
  to?: string;
}): Promise<DashboardData> {
  const { data } = await client.get<ApiResponse<DashboardData>>("/dashboard", {
    params,
  });
  return data.data;
}
