import assert from "node:assert/strict";
import test from "node:test";

import { domainView } from "./domain-view.ts";

test("managed domain exposes controls and all-path label", () => {
  assert.deepEqual(domainView({ managed: true, path: "" }), {
    source: "Managed",
    path: "All paths",
    canManage: true,
    hasProcess: true,
  });
});

test("Cloudflare-synced domain is read-only and keeps configured path", () => {
  assert.deepEqual(domainView({ managed: false, path: "/api/.*" }), {
    source: "Cloudflare sync",
    path: "/api/.*",
    canManage: false,
    hasProcess: false,
  });
});
