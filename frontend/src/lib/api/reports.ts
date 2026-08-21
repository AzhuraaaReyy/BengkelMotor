import client from "./client";
import type { ApiResponse } from "@/types";

export interface ReportParams {
  from: string;
  to: string;
  page?: number;
  per_page?: number;
}

async function getReport<T>(path: string, params: ReportParams): Promise<T> {
  const { data } = await client.get<ApiResponse<T>>(`/reports/${path}`, {
    params,
  });
  return data.data;
}

export function getSalesReportApi(params: ReportParams) {
  return getReport<any>("sales", params);
}

export function getServiceReportApi(params: ReportParams) {
  return getReport<any>("services", params);
}

export function getInventoryReportApi(params: ReportParams) {
  return getReport<{ data: any[] }>("inventory", params);
}

export function getFinanceReportApi(params: ReportParams) {
  return getReport<any>("finance", params);
}

export type ExportFormat = "xlsx" | "pdf";

export async function exportReportApi(
  path: string,
  params: ReportParams,
  format: ExportFormat,
): Promise<Blob> {
  const { data } = await client.post<Blob>(
    `/reports/${path}/export`,
    { format },
    { params, responseType: "blob" },
  );
  return data;
}
