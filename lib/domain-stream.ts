"use client";

import type { QueryClient } from "@tanstack/react-query";

import { parseDomainListEvent, parseLogsEvent, parseMetricsErrorEvent, parseMetricsEvent } from "./domain-stream-core";
import type { Domain } from "./api";

const allDomainsKey = ["domains"] as const;
const detailKey = (id: string) => ["domains", id] as const;
const logsKey = (id: string) => ["domains", id, "logs"] as const;
const metricsKey = (id: string) => ["domains", id, "metrics"] as const;
const metricsErrorKey = (id: string) => ["domains", id, "metrics-error"] as const;

function redirectIfLoggedOut() {
  void fetch("/api/session")
    .then((response) => response.ok ? response.json() as Promise<{ authenticated?: unknown }> : undefined)
    .then((session) => {
      if (session?.authenticated === false) window.location.assign("/login");
    });
}

export function subscribeDomains(queryClient: QueryClient): () => void {
  const source = new EventSource("/api/domains/stream");
  source.addEventListener("domains", (event) => {
    const domains = parseDomainListEvent(event.data);
    if (!domains) return;
    queryClient.setQueryData(allDomainsKey, domains);
    for (const domain of domains) queryClient.setQueryData<Domain>(detailKey(domain.id), domain);
  });
  source.addEventListener("error", redirectIfLoggedOut);
  return () => source.close();
}

export function subscribeDomainDetail(queryClient: QueryClient, id: string): () => void {
  const source = new EventSource(`/api/domains/${encodeURIComponent(id)}/stream`);
  source.addEventListener("logs", (event) => {
    const lines = parseLogsEvent(event.data);
    if (lines !== undefined) queryClient.setQueryData(logsKey(id), lines);
  });
  source.addEventListener("metrics", (event) => {
    const text = parseMetricsEvent(event.data);
    if (text === undefined) return;
    queryClient.setQueryData(metricsKey(id), text);
    queryClient.removeQueries({ queryKey: metricsErrorKey(id), exact: true });
  });
  source.addEventListener("metrics-error", (event) => {
    const message = parseMetricsErrorEvent(event.data);
    if (message) queryClient.setQueryData(metricsErrorKey(id), message);
  });
  source.addEventListener("error", redirectIfLoggedOut);
  return () => source.close();
}
