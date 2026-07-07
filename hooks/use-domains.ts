import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createDomain,
  deleteDomain,
  getDomain,
  getLogs,
  getMetrics,
  listDomains,
  restartDomain,
  stopDomain,
  updateOrigin,
} from "@/lib/api";

export const domainKeys = {
  all: ["domains"] as const,
  detail: (id: string) => ["domains", id] as const,
  logs: (id: string) => ["domains", id, "logs"] as const,
  metrics: (id: string) => ["domains", id, "metrics"] as const,
};

const LIST_POLL_INTERVAL_MS = 5000;
const LOGS_POLL_INTERVAL_MS = 4000;
const METRICS_POLL_INTERVAL_MS = 4000;

export function useDomains() {
  return useQuery({
    queryKey: domainKeys.all,
    queryFn: listDomains,
    refetchInterval: LIST_POLL_INTERVAL_MS,
  });
}

export function useDomain(id: string) {
  return useQuery({
    queryKey: domainKeys.detail(id),
    queryFn: () => getDomain(id),
    refetchInterval: LIST_POLL_INTERVAL_MS,
    enabled: Boolean(id),
  });
}

export function useLogs(id: string) {
  return useQuery({
    queryKey: domainKeys.logs(id),
    queryFn: () => getLogs(id),
    refetchInterval: LOGS_POLL_INTERVAL_MS,
    enabled: Boolean(id),
  });
}

export function useMetrics(id: string) {
  return useQuery({
    queryKey: domainKeys.metrics(id),
    queryFn: () => getMetrics(id),
    refetchInterval: METRICS_POLL_INTERVAL_MS,
    enabled: Boolean(id),
  });
}

export function useCreateDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDomain,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: domainKeys.all });
    },
  });
}

export function useUpdateOrigin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, originUrl }: { id: string; originUrl: string }) =>
      updateOrigin(id, originUrl),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: domainKeys.all });
      queryClient.invalidateQueries({ queryKey: domainKeys.detail(variables.id) });
    },
  });
}

export function useDeleteDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDomain(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: domainKeys.all });
    },
  });
}

export function useStopDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => stopDomain(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: domainKeys.all });
      queryClient.invalidateQueries({ queryKey: domainKeys.detail(id) });
    },
  });
}

export function useRestartDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restartDomain(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: domainKeys.all });
      queryClient.invalidateQueries({ queryKey: domainKeys.detail(id) });
    },
  });
}
