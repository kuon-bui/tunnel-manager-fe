import assert from "node:assert/strict";
import test from "node:test";

import { DOMAIN_API_BASE_URL, DOMAINS_PATH, updateOriginPayload } from "./api-config.ts";

test("domain API uses same-origin backend proxy", () => {
  assert.equal(DOMAIN_API_BASE_URL, "/api");
  assert.equal(DOMAINS_PATH, "/domains");
});

  test("update origin uses backend contract", () => {
  assert.deepEqual(updateOriginPayload("http://localhost:3001"), {
     originUrl: "http://localhost:3001",
  });
});
