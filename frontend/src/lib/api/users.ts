import client from "./client";
import type { ApiResponse, Paginated, User } from "@/types";

export interface UserPayload {
  name: string;
  username: string;
  email: string;
  password?: string;
  role: "ADMIN" | "CASHIER";
  is_active: boolean;
}

export async function getUsersApi(params?: Record<string, unknown>) {
  const { data } = await client.get<ApiResponse<Paginated<User>>>("/users", {
    params,
  });
  return data.data;
}

export async function createUserApi(payload: UserPayload): Promise<User> {
  const { data } = await client.post<ApiResponse<User>>("/users", payload);
  return data.data;
}

export async function updateUserApi(
  id: number,
  payload: Partial<UserPayload>,
): Promise<User> {
  const { data } = await client.put<ApiResponse<User>>(`/users/${id}`, payload);
  return data.data;
}
