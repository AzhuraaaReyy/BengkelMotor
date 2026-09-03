import client from "./client";

export interface SearchResult {
  products: Array<{
    id: number;
    type: "product";
    name: string;
    sku: string;
    category: string;
    current_stock: number;
    sale_price: number;
    image: string | null;
  }>;
  services: Array<{
    id: number;
    type: "service";
    name: string;
    sale_price: number;
    description: string;
  }>;
  customers: Array<{
    id: number;
    type: "customer";
    name: string;
    phone: string;
    email: string | null;
  }>;
  sales: Array<{
    id: number;
    type: "sale";
    sale_code: string;
    customer_name: string | null;
    grand_total: number;
    status: string;
    created_at: string;
  }>;
  total: number;
}

export async function searchGlobalApi(query: string): Promise<SearchResult> {
  const res = await client.get("/search", { params: { q: query } });
  return res.data;
}
