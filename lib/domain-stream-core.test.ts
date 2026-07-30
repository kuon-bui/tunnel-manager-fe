import assert from "node:assert/strict";
import test from "node:test";

import {
  parseDomainListEvent,
  parseLogsEvent,
  parseMetricsErrorEvent,
  parseMetricsEvent,
} from "./domain-stream-core.ts";

const domain = {
  id: "domain-1",
  hostname: "app.example.com",
  originUrl: "http://localhost:8080",
  path: "/*",
  managed: true,
  cloudflareStatus: "active",
  zoneId: "zone-1",
  status: "active",
  metricsPort: 20500,
  pid: 42,
  restartCount: 0,
  createdAt: "2026-07-29T00:00:00Z",
  updatedAt: "2026-07-29T00:00:00Z",
};

test("domain stream accepts full snapshots and preserves frontend fields", () => {
  assert.deepEqual(parseDomainListEvent(JSON.stringify({ items: [domain], nextCursor: "" })), [domain]);
});

test("domain stream normalizes fields absent from managed backend snapshots", () => {
  const managedDomain = { ...domain } as Partial<typeof domain>;
  delete managedDomain.path;
  delete managedDomain.managed;
  delete managedDomain.cloudflareStatus;
  assert.deepEqual(parseDomainListEvent(JSON.stringify({ items: [managedDomain], nextCursor: "" })), [
    { ...managedDomain, path: "", managed: true, cloudflareStatus: "" },
  ]);
});

test("domain stream rejects malformed snapshots", () => {
  assert.equal(parseDomainListEvent('{"items":[{"id":1}]}'), undefined);
  assert.equal(parseDomainListEvent("not json"), undefined);
});

test("domain stream treats a nil backend snapshot as empty", () => {
  assert.deepEqual(parseDomainListEvent('{"items":null,"nextCursor":""}'), []);
});

test("detail stream validates logs, metrics, and metric errors", () => {
  assert.deepEqual(parseLogsEvent('{"items":["one","two"]}'), ["one", "two"]);
  assert.equal(parseLogsEvent('{"items":[1]}'), undefined);
  assert.equal(parseMetricsEvent('{"text":"up 1\\n"}'), "up 1\n");
  assert.equal(parseMetricsEvent('{"text":1}'), undefined);
  assert.equal(parseMetricsErrorEvent('{"message":"metrics unavailable"}'), "metrics unavailable");
  assert.equal(parseMetricsErrorEvent('{"message":false}'), undefined);
});
