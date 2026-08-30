import assert from "node:assert/strict";
import test from "node:test";

import {
  parseDomainListEvent,
  parseLogsEvent,
  parseMetricsErrorEvent,
  parseMetricsEvent,
} from "./domain-stream-core.ts";

const route = {
  id: "route-1",
  path: "/",
  originUrl: "http://localhost:8080",
  stripPrefix: false,
  createdAt: "2026-08-29T00:00:00Z",
  updatedAt: "2026-08-29T00:00:00Z",
};

const domain = {
  id: "domain-1",
  hostname: "app.example.com",
  originUrl: "http://localhost:8080",
  zoneId: "zone-1",
  status: "active",
  metricsPort: 20500,
  pid: 42,
  restartCount: 0,
  createdAt: "2026-07-29T00:00:00Z",
  updatedAt: "2026-07-29T00:00:00Z",
  routes: [route],
};

test("domain stream accepts full snapshots with routes", () => {
  assert.deepEqual(parseDomainListEvent(JSON.stringify({ items: [domain], nextCursor: "" })), [domain]);
});

test("domain stream normalizes missing routes and derives origin from root route", () => {
  const withoutOrigin = {
    ...domain,
    originUrl: undefined,
    routes: [
      {
        id: "route-api",
        path: "/api",
        originUrl: "http://localhost:9000",
        stripPrefix: true,
        createdAt: "2026-08-29T00:00:00Z",
        updatedAt: "2026-08-29T00:00:00Z",
      },
      route,
    ],
  };
  assert.deepEqual(parseDomainListEvent(JSON.stringify({ items: [withoutOrigin], nextCursor: "" })), [
    {
      ...domain,
      originUrl: "http://localhost:8080",
      routes: withoutOrigin.routes,
    },
  ]);
});

test("domain stream rejects malformed route snapshots", () => {
  assert.equal(parseDomainListEvent(JSON.stringify({
    items: [{ ...domain, routes: [{ path: "/" }] }],
    nextCursor: "",
  })), undefined);
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
