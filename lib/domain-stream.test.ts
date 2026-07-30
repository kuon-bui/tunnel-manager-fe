import assert from "node:assert/strict";
import test from "node:test";

import { QueryClient } from "@tanstack/react-query";

import type { Domain } from "./api.ts";
import { applyDomainSnapshot, applyLogsSnapshot, applyMetricsSnapshot } from "./domain-stream-core.ts";
import {
  createSerialTaskQueue,
  notifySessionTokenChanged,
  subscribeToSessionTokenChanges,
  subscribeWithSessionTokenChanges,
} from "./session-events.ts";

const domain: Domain = {
  id: "domain-1",
  hostname: "app.example.com",
  originUrl: "http://localhost:8080",
  path: "",
  managed: true,
  cloudflareStatus: "",
  zoneId: "zone-1",
  status: "active",
  metricsPort: 20500,
  pid: 42,
  restartCount: 0,
  createdAt: "2026-07-29T00:00:00Z",
  updatedAt: "2026-07-29T00:00:00Z",
};

test("domain SSE cancels stale REST work and removes deleted detail cache", async () => {
  const queryClient = new QueryClient();
  const deleted = { ...domain, id: "domain-2" };
  queryClient.setQueryData(["domains"], [deleted]);
  queryClient.setQueryData(["domains", deleted.id], deleted);
  queryClient.setQueryData(["domains", deleted.id, "logs"], ["deleted"]);
  let resolveFetch!: (value: Domain[]) => void;
  let resolveDetail!: (value: Domain) => void;
  const staleFetch = queryClient.fetchQuery({
    queryKey: ["domains"],
    queryFn: () => new Promise<Domain[]>((resolve) => { resolveFetch = resolve; }),
  }).catch(() => undefined);
  const staleDetail = queryClient.fetchQuery({
    queryKey: ["domains", domain.id],
    queryFn: () => new Promise<Domain>((resolve) => { resolveDetail = resolve; }),
  }).catch(() => undefined);
  await Promise.resolve();

  await applyDomainSnapshot(queryClient, [domain]);
  resolveFetch([{ ...domain, hostname: "stale.example.com" }]);
  resolveDetail({ ...domain, hostname: "stale.example.com" });
  await Promise.all([staleFetch, staleDetail]);

  assert.deepEqual(queryClient.getQueryData(["domains"]), [domain]);
  assert.deepEqual(queryClient.getQueryData(["domains", domain.id]), domain);
  assert.equal(queryClient.getQueryData(["domains", deleted.id]), undefined);
  assert.equal(queryClient.getQueryData(["domains", deleted.id, "logs"]), undefined);
});

test("detail SSE cancels stale log and metric REST work", async () => {
  const queryClient = new QueryClient();
  let resolveLogs!: (value: string[]) => void;
  let resolveMetrics!: (value: string) => void;
  const staleLogs = queryClient.fetchQuery({
    queryKey: ["domains", domain.id, "logs"],
    queryFn: () => new Promise<string[]>((resolve) => { resolveLogs = resolve; }),
  }).catch(() => undefined);
  const staleMetrics = queryClient.fetchQuery({
    queryKey: ["domains", domain.id, "metrics"],
    queryFn: () => new Promise<string>((resolve) => { resolveMetrics = resolve; }),
  }).catch(() => undefined);
  await Promise.resolve();

  await Promise.all([
    applyLogsSnapshot(queryClient, domain.id, ["live"]),
    applyMetricsSnapshot(queryClient, domain.id, "up 1\n"),
  ]);
  resolveLogs(["stale"]);
  resolveMetrics("up 0\n");
  await Promise.all([staleLogs, staleMetrics]);

  assert.deepEqual(queryClient.getQueryData(["domains", domain.id, "logs"]), ["live"]);
  assert.equal(queryClient.getQueryData(["domains", domain.id, "metrics"]), "up 1\n");
});

test("session token signal restarts listeners until cleanup", () => {
  const target = new EventTarget();
  let calls = 0;
  const unsubscribe = subscribeToSessionTokenChanges(target, () => calls++);
  notifySessionTokenChanged(target);
  assert.equal(calls, 1);
  unsubscribe();
  notifySessionTokenChanged(target);
  assert.equal(calls, 1);
});

test("session token signal replaces active stream", () => {
  const target = new EventTarget();
  let starts = 0;
  let closes = 0;
  const queues: unknown[] = [];
  const unsubscribe = subscribeWithSessionTokenChanges((enqueue) => {
    queues.push(enqueue);
    starts++;
    return () => closes++;
  }, target);
  notifySessionTokenChanged(target);
  assert.deepEqual({ starts, closes }, { starts: 2, closes: 1 });
  assert.equal(queues[0], queues[1]);
  unsubscribe();
  assert.deepEqual({ starts, closes }, { starts: 2, closes: 2 });
});

test("serial task queue preserves event order and survives task failure", async () => {
  const enqueue = createSerialTaskQueue();
  const order: string[] = [];
  let release!: () => void;

  const first = enqueue(async () => {
    order.push("old-start");
    await new Promise<void>((resolve) => { release = resolve; });
    order.push("old-end");
  });
  const failed = enqueue(() => { throw new Error("stale event failed"); });
  const newest = enqueue(() => { order.push("new"); });

  await Promise.resolve();
  assert.deepEqual(order, ["old-start"]);
  release();
  await Promise.all([first, failed, newest]);
  assert.deepEqual(order, ["old-start", "old-end", "new"]);
});