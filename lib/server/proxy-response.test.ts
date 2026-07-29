import assert from "node:assert/strict";
import test from "node:test";

import { proxyResponseHeaders } from "./proxy-response.ts";

test("proxy response preserves SSE streaming headers", () => {
  const headers = proxyResponseHeaders(new Headers({
    "cache-control": "no-cache",
    connection: "keep-alive",
    "content-type": "text/event-stream",
    "x-accel-buffering": "no",
  }));
  assert.equal(headers.get("content-type"), "text/event-stream");
  assert.equal(headers.get("cache-control"), "no-cache");
  assert.equal(headers.get("connection"), "keep-alive");
  assert.equal(headers.get("x-accel-buffering"), "no");
});

test("proxy response does not copy unrelated backend headers", () => {
  const headers = proxyResponseHeaders(new Headers({
    "content-length": "123",
    "content-type": "application/json",
    "set-cookie": "secret=value",
  }));
  assert.equal(headers.get("content-type"), "application/json");
  assert.equal(headers.get("content-length"), null);
  assert.equal(headers.get("set-cookie"), null);
});
