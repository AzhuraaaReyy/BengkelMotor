import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getServicesApi,
  createServiceApi,
  updateServiceApi,
  type ServicePayload,
} from "@/lib/api/services";

export const SERVICES_QUERY_KEY = ["services"] as const;

interface UseServicesOptions {
  search?: string;
  page?: number;
  per_page?: number;
  [key: string]: unknown;
}

export function useServices(options: UseServicesOptions = {}) {
  const queryClient = useQueryClient();

  const {
    data: servicesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: [...SERVICES_QUERY_KEY, options],
    queryFn: () => getServicesApi(options),
    staleTime: 1000 * 60,
  });

  const createMutation = useMutation({
    mutationFn: createServiceApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERVICES_QUERY_KEY });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<ServicePayload> }) =>
      updateServiceApi(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERVICES_QUERY_KEY });
    },
  });

  return {
    services: servicesData?.data ?? [],
    lastPage: servicesData?.last_page ?? 1,
    total: servicesData?.total ?? 0,
    isLoading,
    error,
    createService: createMutation.mutateAsync,
    updateService: updateMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}
