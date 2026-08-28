import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProductsApi,
  createProductApi,
  updateProductApi,
  adjustStockApi,
  getProductMovementsApi,
  type ProductPayload,
  type StockAdjustPayload,
} from "@/lib/api/products";
import type { StockMovement } from "@/types";

export const PRODUCTS_QUERY_KEY = ["products"] as const;
export const PRODUCT_MOVEMENTS_QUERY_KEY = ["products", "movements"] as const;

interface UseProductsOptions extends Record<string, unknown> {
  search?: string;
  page?: number;
  per_page?: number;
  include_cost?: number;
}

export function useProducts(options: UseProductsOptions = {}) {
  const queryClient = useQueryClient();

  // Fetch products list
  const {
    data: productsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: [...PRODUCTS_QUERY_KEY, options],
    queryFn: () => getProductsApi(options),
    staleTime: 1000 * 30, // 30 seconds
  });

  // Create product mutation
  const createMutation = useMutation({
    mutationFn: createProductApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
    },
  });

  // Update product mutation
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Partial<ProductPayload>;
    }) => updateProductApi(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
    },
  });

  // Adjust stock mutation
  const adjustStockMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: StockAdjustPayload;
    }) => adjustStockApi(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return {
    products: productsData?.data ?? [],
    lastPage: productsData?.last_page ?? 1,
    total: productsData?.total ?? 0,
    isLoading,
    error,
    createProduct: createMutation.mutateAsync,
    updateProduct: updateMutation.mutateAsync,
    adjustStock: adjustStockMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isAdjusting: adjustStockMutation.isPending,
  };
}

export function useProductMovements(
  productId: number,
  options: { per_page?: number } = {},
) {
  const {
    data: movementsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: [...PRODUCT_MOVEMENTS_QUERY_KEY, productId, options],
    queryFn: () => getProductMovementsApi(productId, options),
    enabled: productId > 0,
    staleTime: 1000 * 30, // 30 seconds
  });

  return {
    movements: (movementsData?.data ?? []) as StockMovement[],
    isLoading,
    error,
  };
}
