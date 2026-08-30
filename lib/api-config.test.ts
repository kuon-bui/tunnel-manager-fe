import assert from "node:assert/strict";
import test from "node:test";

import {
  DOMAIN_API_BASE_URL,
  DOMAINS_PATH,
  createDomainPayload,
  hostnameForZone,
  replaceRoutesPayload,
  selectedZoneID,
  updateOriginPayload,
} from "./api-config.ts";

test("domain API uses same-origin backend proxy", () => {
  assert.equal(DOMAIN_API_BASE_URL, "/api");
  assert.equal(DOMAINS_PATH, "/domains");
});

test("create domain uses multi-route backend contract", () => {
  assert.deepEqual(
    createDomainPayload("app.example.com", "zone-1", [
      { path: "/api", originUrl: "http://localhost:8080", stripPrefix: true },
      { path: "/", originUrl: "http://localhost:3001" },
    ]),
    {
      hostname: "app.example.com",
      zoneId: "zone-1",
      routes: [
        { path: "/api", originUrl: "http://localhost:8080", stripPrefix: true },
        { path: "/", originUrl: "http://localhost:3001" },
      ],
    },
  );
});

test("replace routes uses backend contract", () => {
  assert.deepEqual(
    replaceRoutesPayload([
      { path: "/", originUrl: "http://localhost:5173", stripPrefix: false },
    ]),
    {
      routes: [
        { path: "/", originUrl: "http://localhost:5173", stripPrefix: false },
      ],
    },
  );
});

test("update origin uses deprecated root-only backend contract", () => {
  assert.deepEqual(updateOriginPayload("http://localhost:3001"), {
    originUrl: "http://localhost:3001",
  });
});

test("zone selection defaults to first available zone", () => {
  const zones = [{ id: "zone-1" }, { id: "zone-2" }];
  assert.equal(selectedZoneID("zone-2", zones), "zone-2");
  assert.equal(selectedZoneID("missing", zones), "zone-1");
  assert.equal(selectedZoneID("", []), "");
});

test("short hostname expands into the selected zone", () => {
  assert.equal(hostnameForZone("api-tunnel", "example.com"), "api-tunnel.example.com");
  assert.equal(hostnameForZone(" API-TUNNEL ", " Example.COM. "), "api-tunnel.example.com");
});

test("hostname already inside the selected zone remains fully qualified", () => {
  assert.equal(hostnameForZone("api.example.com", "example.com"), "api.example.com");
  assert.equal(hostnameForZone("example.com", "example.com"), "example.com");
});

test("hostname outside the selected zone is rejected", () => {
  assert.equal(hostnameForZone("api.other.test", "example.com"), undefined);
  assert.equal(hostnameForZone("api-tunnel", ""), undefined);
  assert.equal(hostnameForZone("", "example.com"), undefined);
});
