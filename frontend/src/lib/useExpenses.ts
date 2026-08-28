import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getExpensesApi,
  createExpenseApi,
  updateExpenseApi,
  type ExpensePayload,
} from "@/lib/api/expenses";

export const EXPENSES_QUERY_KEY = ["expenses"] as const;

interface UseExpensesOptions {
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
  [key: string]: unknown;
}

export function useExpenses(options: UseExpensesOptions = {}) {
  const queryClient = useQueryClient();

  const {
    data: expensesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: [...EXPENSES_QUERY_KEY, options],
    queryFn: () => getExpensesApi(options),
    staleTime: 1000 * 60,
  });

  const createMutation = useMutation({
    mutationFn: createExpenseApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<ExpensePayload> }) =>
      updateExpenseApi(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY });
    },
  });

  return {
    expenses: expensesData?.data ?? [],
    lastPage: expensesData?.last_page ?? 1,
    total: expensesData?.total ?? 0,
    isLoading,
    error,
    createExpense: createMutation.mutateAsync,
    updateExpense: updateMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}
