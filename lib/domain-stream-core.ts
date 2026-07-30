import type { Domain, DomainStatus } from "./api.ts";
import type { QueryClient } from "@tanstack/react-query";

function parseObject(data: string): Record<string, unknown> | undefined {
  try {
    const value: unknown = JSON.parse(data);
    return value !== null && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : undefined;
  } catch {
    return undefined;
  }
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isDomainStatus(value: unknown): value is DomainStatus {
  return value === "pending" || value === "active" || value === "error" || value === "stopped";
}

export function normalizeDomain(domain: Domain): Domain {
  return {
    ...domain,
    path: domain.path ?? "",
    managed: domain.managed ?? true,
    cloudflareStatus: domain.cloudflareStatus ?? "",
  };
}

function parseDomain(value: unknown): Domain | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
  const domain = value as Record<string, unknown>;
  if (!(isString(domain.id)
    && isString(domain.hostname)
    && isString(domain.originUrl)
    && isString(domain.zoneId)
    && isDomainStatus(domain.status)
    && typeof domain.metricsPort === "number"
    && typeof domain.pid === "number"
    && typeof domain.restartCount === "number"
    && isString(domain.createdAt)
    && isString(domain.updatedAt))) return undefined;
  if (domain.path !== undefined && !isString(domain.path)) return undefined;
  if (domain.managed !== undefined && typeof domain.managed !== "boolean") return undefined;
  if (domain.cloudflareStatus !== undefined && !isString(domain.cloudflareStatus)) return undefined;
  return normalizeDomain(domain as unknown as Domain);
}

export function parseDomainListEvent(data: string): Domain[] | undefined {
  const value = parseObject(data);
  if (value?.items === null) return [];
  if (!value || !Array.isArray(value.items)) return undefined;
  const domains = value.items.map(parseDomain);
  return domains.every((domain): domain is Domain => domain !== undefined) ? domains : undefined;
}

export async function applyDomainSnapshot(queryClient: QueryClient, domains: Domain[]): Promise<void> {
  await queryClient.cancelQueries({ queryKey: ["domains"], exact: true });
  await Promise.all(domains.map((domain) => queryClient.cancelQueries({
    queryKey: ["domains", domain.id],
    exact: true,
  })));
  const ids = new Set(domains.map((domain) => domain.id));
  const removedIds = new Set<string>();
  for (const [queryKey] of queryClient.getQueriesData({ queryKey: ["domains"] })) {
    if (typeof queryKey[1] === "string" && !ids.has(queryKey[1])) removedIds.add(queryKey[1]);
  }
  for (const id of removedIds) {
    await queryClient.cancelQueries({ queryKey: ["domains", id] });
    queryClient.removeQueries({ queryKey: ["domains", id] });
  }
  queryClient.setQueryData(["domains"], domains);
  for (const domain of domains) queryClient.setQueryData(["domains", domain.id], domain);
}

export async function applyLogsSnapshot(queryClient: QueryClient, id: string, lines: string[]): Promise<void> {
  const queryKey = ["domains", id, "logs"] as const;
  await queryClient.cancelQueries({ queryKey, exact: true });
  queryClient.setQueryData(queryKey, lines);
}

export async function applyMetricsSnapshot(queryClient: QueryClient, id: string, text: string): Promise<void> {
  const queryKey = ["domains", id, "metrics"] as const;
  await queryClient.cancelQueries({ queryKey, exact: true });
  queryClient.setQueryData(queryKey, text);
}

export function parseLogsEvent(data: string): string[] | undefined {
  const value = parseObject(data);
  return value && Array.isArray(value.items) && value.items.every(isString) ? value.items : undefined;
}

export function parseMetricsEvent(data: string): string | undefined {
  const value = parseObject(data);
  return value && isString(value.text) ? value.text : undefined;
}

export function parseMetricsErrorEvent(data: string): string | undefined {
  const value = parseObject(data);
  return value && isString(value.message) ? value.message : undefined;
}
