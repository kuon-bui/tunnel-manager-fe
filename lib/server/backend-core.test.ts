import assert from "node:assert/strict";
import test from "node:test";

import {
  authenticatedFromBackendStatus,
  backendURL,
  cloudflareAccessCredentials,
  isSameOrigin,
  proxyRequestInit,
} from "./backend-core.ts";

test("backend URL is server configured and preserves path and query", () => {
  assert.equal(
    backendURL("http://localhost:8180", ["domains", "abc", "logs"], "?tail=20").href,
    "http://localhost:8180/api/domains/abc/logs?tail=20",
  );
  assert.throws(() => backendURL("file:///tmp/api", ["domains"], ""), /API_BASE_URL/);
  assert.throws(() => backendURL("not a URL", ["domains"], ""), /API_BASE_URL/);
  assert.throws(() => backendURL("http://localhost:8180", ["..", "auth"], ""));
});

test("same-origin check uses the external request host instead of the container bind address", () => {
  const internalURL = "http://0.0.0.0:3000/api/session";

  assert.equal(isSameOrigin("http://localhost:3000", "localhost:3000", null, null, internalURL), true);
  assert.equal(isSameOrigin("http://10.10.1.10:3000", "10.10.1.10:3000", null, null, internalURL), true);
  assert.equal(isSameOrigin("http://evil.test", "localhost:3000", null, null, internalURL), false);
  assert.equal(isSameOrigin(null, "localhost:3000", null, null, internalURL), false);
});

test("same-origin check honors reverse-proxy host and protocol", () => {
  const internalURL = "http://0.0.0.0:3000/api/session";

  assert.equal(
    isSameOrigin(
      "https://manager.example.com",
      "frontend:3000",
      "manager.example.com, edge.internal",
      "https, http",
      internalURL,
    ),
    true,
  );
  assert.equal(
    isSameOrigin("http://manager.example.com", "frontend:3000", "manager.example.com", "https", internalURL),
    false,
  );
  assert.equal(isSameOrigin("not a URL", "localhost:3000", null, null, internalURL), false);
});

test("Cloudflare Access credentials must be configured as a complete pair", () => {
  assert.equal(cloudflareAccessCredentials(undefined, undefined), undefined);
  assert.throws(() => cloudflareAccessCredentials("client-id", undefined), /Cloudflare Access/);
  assert.throws(() => cloudflareAccessCredentials(undefined, "client-secret"), /Cloudflare Access/);
  assert.deepEqual(cloudflareAccessCredentials(" client-id ", " client-secret "), {
    clientId: "client-id",
    clientSecret: "client-secret",
  });
});

test("proxy request ignores browser secrets and adds server credentials", async () => {
  const request = new Request("http://localhost:3000/api/backend/domains/1", {
    method: "PUT",
    headers: {
      authorization: "Bearer attacker",
      "cf-access-client-id": "attacker-id",
      "cf-access-client-secret": "attacker-secret",
      cookie: "stolen=true",
      origin: "http://localhost:3000",
      "content-type": "application/json",
    },
    body: JSON.stringify({ originUrl: "http://localhost:4000" }),
  });
  const init = await proxyRequestInit(request, "trusted", {
    clientId: "trusted-id",
    clientSecret: "trusted-secret",
  });
  const headers = new Headers(init.headers);
  assert.equal(headers.get("authorization"), "Bearer trusted");
  assert.equal(headers.get("cf-access-client-id"), "trusted-id");
  assert.equal(headers.get("cf-access-client-secret"), "trusted-secret");
  assert.equal(headers.get("cookie"), null);
  assert.equal(headers.get("origin"), null);
  assert.equal(headers.get("content-type"), "application/json");
  assert.equal(init.method, "PUT");
  assert.equal(init.body, JSON.stringify({ originUrl: "http://localhost:4000" }));
});

test("proxy request forwards browser disconnect to backend fetch", async () => {
  const controller = new AbortController();
  const request = new Request("http://localhost:3000/api/domains/stream", { signal: controller.signal });
  const init = await proxyRequestInit(request, "trusted");
  assert.equal(init.signal, request.signal);
});

test("session status logs out only after backend unauthorized response", () => {
  assert.equal(authenticatedFromBackendStatus(200), true);
  assert.equal(authenticatedFromBackendStatus(401), false);
  assert.equal(authenticatedFromBackendStatus(502), undefined);
});
