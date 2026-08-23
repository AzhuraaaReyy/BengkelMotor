import client from "./client";
import type {
  ApiResponse,
  LowStockCounts,
  LowStockItem,
  Paginated,
  Product,
  StockMovement,
} from "@/types";

export interface ProductPayload {
  sku: string;
  name: string;
  category?: string;
  brand?: string;
  unit: string;
  purchase_price: number;
  sale_price: number;
  min_stock: number;
  is_active: boolean;
  image?: File | null;
}

export interface StockAdjustPayload {
  type: "PURCHASE" | "ADJUSTMENT";
  quantity: number;
  note: string;
}

function toFormData(payload: ProductPayload): FormData {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (value instanceof File) {
        formData.append(key, value);
      } else {
        formData.append(key, String(value));
      }
    }
  });
  return formData;
}

export interface StockAdjustPayload {
  type: "PURCHASE" | "ADJUSTMENT";
  quantity: number;
  note: string;
}

export async function getProductsApi(params?: Record<string, unknown>) {
  const { data } = await client.get<ApiResponse<Paginated<Product>>>(
    "/products",
    { params },
  );
  return data.data;
}

export async function createProductApi(
  payload: ProductPayload,
): Promise<Product> {
  const formData = toFormData(payload);
  const { data } = await client.post<ApiResponse<Product>>(
    "/products",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return data.data;
}

export async function updateProductApi(
  id: number,
  payload: Partial<ProductPayload>,
): Promise<Product> {
  const formData = toFormData(payload as ProductPayload);
  const { data } = await client.post<ApiResponse<Product>>(
    `/products/${id}`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return data.data;
}

export async function adjustStockApi(
  id: number,
  payload: StockAdjustPayload,
): Promise<Product> {
  const { data } = await client.post<ApiResponse<Product>>(
    `/products/${id}/adjust-stock`,
    payload,
  );
  return data.data;
}

export async function getProductMovementsApi(
  id: number,
  params?: Record<string, unknown>,
) {
  const { data } = await client.get<ApiResponse<Paginated<StockMovement>>>(
    `/products/${id}/movements`,
    { params },
  );
  return data.data;
}

export async function getLowStockApi() {
  const { data } = await client.get<{
    data: LowStockItem[];
    counts: LowStockCounts;
  }>("/products/low-stock");
  return { items: data.data, counts: data.counts };
}
