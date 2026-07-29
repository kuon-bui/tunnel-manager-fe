import type { Domain, DomainStatus } from "./api.ts";

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

function isDomain(value: unknown): value is Domain {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const domain = value as Record<string, unknown>;
  return isString(domain.id)
    && isString(domain.hostname)
    && isString(domain.originUrl)
    && isString(domain.path)
    && typeof domain.managed === "boolean"
    && isString(domain.cloudflareStatus)
    && isString(domain.zoneId)
    && isDomainStatus(domain.status)
    && typeof domain.metricsPort === "number"
    && typeof domain.pid === "number"
    && typeof domain.restartCount === "number"
    && isString(domain.createdAt)
    && isString(domain.updatedAt);
}

export function parseDomainListEvent(data: string): Domain[] | undefined {
  const value = parseObject(data);
  return value && Array.isArray(value.items) && value.items.every(isDomain) ? value.items : undefined;
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
