import axios from "axios";

import {
  DOMAIN_API_BASE_URL,
  DOMAINS_PATH,
  type CreateDomainInput,
  updateOriginPayload,
} from "@/lib/api-config";

export type DomainStatus = "pending" | "active" | "error" | "stopped";

export interface Domain {
  id: string;
  hostname: string;
  originUrl: string;
  path: string;
  managed: boolean;
  cloudflareStatus: string;
  zoneId: string;
  status: DomainStatus;
  metricsPort: number;
  pid: number;
  restartCount: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  cloudflareTunnelId?: string;
  dnsRecordId?: string;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const client = axios.create({
  baseURL: DOMAIN_API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

client.interceptors.response.use(undefined, (error) => {
  if (typeof window !== "undefined" && axios.isAxiosError(error) && error.response?.status === 401) {
    window.location.assign("/login");
  }
  return Promise.reject(error);
});

function extractErrorMessage(data: unknown, fallback: string): string {
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed.error === "string") return parsed.error;
    } catch {
      // response body wasn't JSON (e.g. metrics text endpoint), fall back
    }
    return fallback;
  }
  if (data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string") {
    return (data as { error: string }).error;
  }
  return fallback;
}

function toApiError(err: unknown): ApiError {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status ?? 0;
    return new ApiError(status, extractErrorMessage(err.response?.data, err.message));
  }
  return new ApiError(0, err instanceof Error ? err.message : "Unknown error");
}

async function unwrap<T>(promise: Promise<{ data: T }>): Promise<T> {
  try {
    const res = await promise;
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

interface ListDomainsResponse {
  items: Domain[];
  nextCursor: string;
}

export async function listDomains(): Promise<Domain[]> {
  const res = await unwrap(client.get<ListDomainsResponse>(DOMAINS_PATH));
  return res.items;
}

export function getDomain(id: string): Promise<Domain> {
  return unwrap(client.get<Domain>(`${DOMAINS_PATH}/${id}`));
}

export function createDomain(input: CreateDomainInput): Promise<Domain> {
  return unwrap(client.post<Domain>(DOMAINS_PATH, input));
}

export function updateOrigin(id: string, originUrl: string): Promise<Domain> {
  return unwrap(client.put<Domain>(`${DOMAINS_PATH}/${id}`, updateOriginPayload(originUrl)));
}

export function deleteDomain(id: string): Promise<void> {
  return unwrap(client.delete<void>(`${DOMAINS_PATH}/${id}`));
}

export function stopDomain(id: string): Promise<void> {
  return unwrap(client.post<void>(`${DOMAINS_PATH}/${id}/stop`));
}

export function restartDomain(id: string): Promise<void> {
  return unwrap(client.post<void>(`${DOMAINS_PATH}/${id}/restart`));
}

export function getLogs(id: string): Promise<string[]> {
  return unwrap(client.get<string[]>(`${DOMAINS_PATH}/${id}/logs`));
}

export function getMetrics(id: string): Promise<string> {
  return unwrap(client.get<string>(`${DOMAINS_PATH}/${id}/metrics`, { responseType: "text" }));
}

export function login(input: { username: string; password: string }): Promise<void> {
  return unwrap(axios.post<void>("/api/session/login", input));
}

export function logout(): Promise<void> {
  return unwrap(axios.delete<void>("/api/session"));
}

export function changePassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
  return unwrap(axios.put<void>("/api/session/password", input));
}
