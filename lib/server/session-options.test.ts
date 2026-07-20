import assert from "node:assert/strict";
import test from "node:test";

import { sessionCookieOptions } from "./session-options.ts";

test("session cookie stays HttpOnly and expires with backend token", () => {
  const expiresAt = "2026-07-27T12:00:00Z";
  assert.deepEqual(sessionCookieOptions(expiresAt, false), {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
  assert.equal(sessionCookieOptions(expiresAt, true).secure, true);
});

test("session cookie rejects invalid or expired backend expiry", () => {
  assert.throws(() => sessionCookieOptions("invalid", false));
  assert.throws(() => sessionCookieOptions("2000-01-01T00:00:00Z", false));
});
