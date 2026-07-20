import "server-only";

import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME, sessionCookieOptions } from "./session-options";

export { SESSION_COOKIE_NAME } from "./session-options";

export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE_NAME)?.value;
}

export async function setSessionToken(token: string, expiresAt: string): Promise<void> {
  (await cookies()).set(
    SESSION_COOKIE_NAME,
    token,
    sessionCookieOptions(expiresAt, process.env.NODE_ENV === "production"),
  );
}

export async function deleteSessionToken(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE_NAME);
}
