"use client";

import type { QueryClient } from "@tanstack/react-query";

import { applyDomainSnapshot, applyLogsSnapshot, applyMetricsSnapshot, parseDomainListEvent, parseLogsEvent, parseMetricsErrorEvent, parseMetricsEvent } from "./domain-stream-core";
import { subscribeWithSessionTokenChanges } from "./session-events";

const metricsErrorKey = (id: string) => ["domains", id, "metrics-error"] as const;

function redirectIfLoggedOut() {
  void fetch("/api/session")
    .then((response) => response.ok ? response.json() as Promise<{ authenticated?: unknown }> : undefined)
    .then((session) => {
      if (session?.authenticated === false) window.location.assign("/login");
    });
}

export function subscribeDomains(queryClient: QueryClient): () => void {
  return subscribeWithSessionTokenChanges((enqueue) => {
    const source = new EventSource("/api/domains/stream");
    source.addEventListener("domains", (event) => {
      const domains = parseDomainListEvent(event.data);
      if (!domains) return;
      void enqueue(() => applyDomainSnapshot(queryClient, domains));
    });
    source.addEventListener("error", redirectIfLoggedOut);
    return () => source.close();
  });
}

export function subscribeDomainDetail(queryClient: QueryClient, id: string): () => void {
  return subscribeWithSessionTokenChanges((enqueue) => {
    const source = new EventSource(`/api/domains/${encodeURIComponent(id)}/stream`);
    source.addEventListener("logs", (event) => {
      const lines = parseLogsEvent(event.data);
      if (lines !== undefined) void enqueue(() => applyLogsSnapshot(queryClient, id, lines));
    });
    source.addEventListener("metrics", (event) => {
      const text = parseMetricsEvent(event.data);
      if (text === undefined) return;
      void enqueue(async () => {
        await applyMetricsSnapshot(queryClient, id, text);
        queryClient.removeQueries({ queryKey: metricsErrorKey(id), exact: true });
      });
    });
    source.addEventListener("metrics-error", (event) => {
      const message = parseMetricsErrorEvent(event.data);
      if (message) void enqueue(() => { queryClient.setQueryData(metricsErrorKey(id), message); });
    });
    source.addEventListener("error", redirectIfLoggedOut);
    return () => source.close();
  });
}
