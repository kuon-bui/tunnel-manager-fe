import assert from "node:assert/strict";
import test from "node:test";

import {
  DOMAIN_API_BASE_URL,
  DOMAINS_PATH,
  createDomainPayload,
  updateOriginPayload,
} from "./api-config.ts";

test("domain API uses same-origin backend proxy", () => {
  assert.equal(DOMAIN_API_BASE_URL, "/api");
  assert.equal(DOMAINS_PATH, "/domains");
});

test("create domain uses backend zone contract", () => {
  assert.deepEqual(
    createDomainPayload("app.example.com", "http://localhost:3001", "zone-1"),
    {
      hostname: "app.example.com",
      originUrl: "http://localhost:3001",
      zoneId: "zone-1",
    },
  );
});

test("update origin uses backend contract", () => {
  assert.deepEqual(updateOriginPayload("http://localhost:3001"), {
    originUrl: "http://localhost:3001",
  });
});
