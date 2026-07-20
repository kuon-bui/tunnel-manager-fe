import assert from "node:assert/strict";
import test from "node:test";

import { backendURL, isSameOrigin, proxyRequestInit } from "./backend-core.ts";

test("backend URL is server configured and preserves path and query", () => {
  assert.equal(
    backendURL("http://localhost:8180", ["domains", "abc", "logs"], "?tail=20").href,
    "http://localhost:8180/api/domains/abc/logs?tail=20",
  );
  assert.throws(() => backendURL("file:///tmp/api", ["domains"], ""), /API_BASE_URL/);
  assert.throws(() => backendURL("not a URL", ["domains"], ""), /API_BASE_URL/);
  assert.throws(() => backendURL("http://localhost:8180", ["..", "auth"], ""));
});

test("same-origin check requires exact browser origin", () => {
  assert.equal(isSameOrigin("http://localhost:3000", "http://localhost:3000/api/session"), true);
  assert.equal(isSameOrigin("http://evil.test", "http://localhost:3000/api/session"), false);
  assert.equal(isSameOrigin(null, "http://localhost:3000/api/session"), false);
});

test("proxy request ignores browser secrets and adds server bearer", async () => {
  const request = new Request("http://localhost:3000/api/backend/domains/1", {
    method: "PUT",
    headers: {
      authorization: "Bearer attacker",
      cookie: "stolen=true",
      origin: "http://localhost:3000",
      "content-type": "application/json",
    },
    body: JSON.stringify({ originUrl: "http://localhost:4000" }),
  });
  const init = await proxyRequestInit(request, "trusted");
  const headers = new Headers(init.headers);
  assert.equal(headers.get("authorization"), "Bearer trusted");
  assert.equal(headers.get("cookie"), null);
  assert.equal(headers.get("origin"), null);
  assert.equal(headers.get("content-type"), "application/json");
  assert.equal(init.method, "PUT");
  assert.equal(init.body, JSON.stringify({ originUrl: "http://localhost:4000" }));
});
