import client from "./client";
import type { ApiResponse, Expense, Paginated } from "@/types";

export interface ExpensePayload {
  expense_date: string;
  category: string;
  amount: number;
  description?: string;
}

export async function getExpensesApi(params?: Record<string, unknown>) {
  const { data } = await client.get<ApiResponse<Paginated<Expense>>>(
    "/expenses",
    { params },
  );
  return data.data;
}

export async function createExpenseApi(
  payload: ExpensePayload,
): Promise<Expense> {
  const { data } = await client.post<ApiResponse<Expense>>(
    "/expenses",
    payload,
  );
  return data.data;
}

export async function updateExpenseApi(
  id: number,
  payload: Partial<ExpensePayload>,
): Promise<Expense> {
  const { data } = await client.put<ApiResponse<Expense>>(
    `/expenses/${id}`,
    payload,
  );
  return data.data;
}
