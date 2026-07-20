export const SESSION_COOKIE_NAME = "tunnel-manager-session";

export function sessionCookieOptions(expiresAt: string, secure: boolean) {
  const expires = new Date(expiresAt);
  if (Number.isNaN(expires.getTime()) || expires <= new Date()) throw new Error("invalid session expiry");
  return { httpOnly: true, secure, sameSite: "lax" as const, path: "/", expires };
}
