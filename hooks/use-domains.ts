import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createDomain,
  deleteDomain,
  getDomain,
  getLogs,
  getMetrics,
  listCloudflareZones,
  listDomains,
  restartDomain,
  stopDomain,
  updateOrigin,
} from "@/lib/api";
import { subscribeDomainDetail } from "@/lib/domain-stream";

export const domainKeys = {
  all: ["domains"] as const,
  detail: (id: string) => ["domains", id] as const,
  logs: (id: string) => ["domains", id, "logs"] as const,
  metrics: (id: string) => ["domains", id, "metrics"] as const,
  metricsError: (id: string) => ["domains", id, "metrics-error"] as const,
  zones: ["cloudflare-zones"] as const,
};

export function useDomains() {
  return useQuery({
    queryKey: domainKeys.all,
    queryFn: listDomains,
  });
}

export function useCloudflareZones(enabled = true) {
  return useQuery({
    queryKey: domainKeys.zones,
    queryFn: listCloudflareZones,
    enabled,
  });
}

export function useDomain(id: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: domainKeys.detail(id),
    queryFn: () => getDomain(id),
    enabled: Boolean(id),
  });
  useEffect(() => id ? subscribeDomainDetail(queryClient, id) : undefined, [id, queryClient]);
  return query;
}

export function useLogs(id: string) {
  return useQuery({
    queryKey: domainKeys.logs(id),
    queryFn: () => getLogs(id),
    enabled: Boolean(id),
  });
}

export function useMetrics(id: string) {
  return useQuery({
    queryKey: domainKeys.metrics(id),
    queryFn: () => getMetrics(id),
    enabled: Boolean(id),
  });
}

export function useMetricsError(id: string) {
  return useQuery<string>({
    queryKey: domainKeys.metricsError(id),
    queryFn: async () => "",
    enabled: false,
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
