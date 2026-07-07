import axios from "axios";

export type DomainStatus = "pending" | "active" | "error" | "stopped";

export interface Domain {
  id: string;
  hostname: string;
  origin_url: string;
  status: DomainStatus;
  metrics_port: number;
  pid: number;
  restart_count: number;
  last_error?: string;
  created_at: string;
  updated_at: string;
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
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080",
  headers: { "Content-Type": "application/json" },
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

export function listDomains(): Promise<Domain[]> {
  return unwrap(client.get<Domain[]>("/api/domains"));
}

export function getDomain(id: string): Promise<Domain> {
  return unwrap(client.get<Domain>(`/api/domains/${id}`));
}

export function createDomain(input: { hostname: string; origin_url: string }): Promise<Domain> {
  return unwrap(client.post<Domain>("/api/domains", input));
}

export function updateOrigin(id: string, originUrl: string): Promise<Domain> {
  return unwrap(client.put<Domain>(`/api/domains/${id}`, { origin_url: originUrl }));
}

export function deleteDomain(id: string): Promise<void> {
  return unwrap(client.delete<void>(`/api/domains/${id}`));
}

export function stopDomain(id: string): Promise<void> {
  return unwrap(client.post<void>(`/api/domains/${id}/stop`));
}

export function restartDomain(id: string): Promise<void> {
  return unwrap(client.post<void>(`/api/domains/${id}/restart`));
}

export function getLogs(id: string): Promise<string[]> {
  return unwrap(client.get<string[]>(`/api/domains/${id}/logs`));
}

export function getMetrics(id: string): Promise<string> {
  return unwrap(client.get<string>(`/api/domains/${id}/metrics`, { responseType: "text" }));
}
