import assert from "node:assert/strict";
import test from "node:test";

import { domainView, formatRouteSummary } from "./domain-view.ts";

const routes = [
  {
    id: "route-api",
    path: "/api",
    originUrl: "http://localhost:8080",
    stripPrefix: true,
    createdAt: "2026-08-29T00:00:00Z",
    updatedAt: "2026-08-29T00:00:00Z",
  },
  {
    id: "route-root",
    path: "/",
    originUrl: "http://localhost:5173",
    stripPrefix: false,
    createdAt: "2026-08-29T00:00:00Z",
    updatedAt: "2026-08-29T00:00:00Z",
  },
];

test("domain view summarizes multiple routes and root origin", () => {
  assert.deepEqual(domainView({ routes, originUrl: "http://localhost:5173" }), {
    routeSummary: "2 routes",
    rootOriginUrl: "http://localhost:5173",
    routes,
    canManage: true,
    hasProcess: true,
  });
});

test("single root route is labeled as all paths", () => {
  assert.equal(formatRouteSummary([routes[1]]), "All paths → /");
});

test("empty routes fall back to dash summary", () => {
  assert.equal(formatRouteSummary([]), "—");
  assert.deepEqual(domainView({ routes: [], originUrl: "http://localhost:1" }).rootOriginUrl, "http://localhost:1");
});
