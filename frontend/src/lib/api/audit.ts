import client from "./client";
import type { ApiResponse, AuditLog, Paginated } from "@/types";

export async function getAuditLogsApi(params?: Record<string, unknown>) {
  const { data } = await client.get<ApiResponse<Paginated<AuditLog>>>(
    "/audit-logs",
    { params },
  );
  return data.data;
}
