import assert from "node:assert/strict";
import test from "node:test";

import {
  defaultEditableRoutes,
  editableRoutesFromDomain,
  toRouteInputs,
  validateEditableRoutes,
} from "./domain-routes.ts";

test("default editable routes start with required root route", () => {
  const routes = defaultEditableRoutes("http://localhost:5173");
  assert.equal(routes.length, 1);
  assert.equal(routes[0].path, "/");
  assert.equal(routes[0].originUrl, "http://localhost:5173");
  assert.equal(routes[0].stripPrefix, false);
});

test("editable routes map from domain routes", () => {
  const routes = editableRoutesFromDomain([
    {
      id: "route-api",
      path: "/api",
      originUrl: "http://localhost:8080",
      stripPrefix: true,
      createdAt: "2026-08-29T00:00:00Z",
      updatedAt: "2026-08-29T00:00:00Z",
    },
  ]);
  assert.deepEqual(toRouteInputs(routes), [
    { path: "/api", originUrl: "http://localhost:8080", stripPrefix: true },
  ]);
});

test("validation requires exactly one root route", () => {
  assert.equal(
    validateEditableRoutes([
      { key: "1", path: "/api", originUrl: "http://localhost:8080", stripPrefix: false },
    ]),
    "Exactly one / route is required.",
  );
  assert.equal(
    validateEditableRoutes([
      { key: "1", path: "/", originUrl: "http://localhost:1", stripPrefix: false },
      { key: "2", path: "/", originUrl: "http://localhost:2", stripPrefix: false },
    ]),
    'Duplicate path "/".',
  );
});


test("validation rejects stripPrefix on root and duplicate paths", () => {
  assert.equal(
    validateEditableRoutes([
      { key: "1", path: "/", originUrl: "http://localhost:1", stripPrefix: true },
    ]),
    "Root path / cannot strip its prefix.",
  );
  assert.equal(
    validateEditableRoutes([
      { key: "1", path: "/api/", originUrl: "http://localhost:1", stripPrefix: false },
      { key: "2", path: "/api", originUrl: "http://localhost:2", stripPrefix: false },
      { key: "3", path: "/", originUrl: "http://localhost:3", stripPrefix: false },
    ]),
    'Duplicate path "/api".',
  );
});

test("toRouteInputs forces stripPrefix false for root", () => {
  assert.deepEqual(
    toRouteInputs([
      { key: "1", path: "/", originUrl: " http://localhost:1 ", stripPrefix: true },
      { key: "2", path: " /api ", originUrl: " http://localhost:2 ", stripPrefix: true },
    ]),
    [
      { path: "/", originUrl: "http://localhost:1", stripPrefix: false },
      { path: "/api", originUrl: "http://localhost:2", stripPrefix: true },
    ],
  );
});
