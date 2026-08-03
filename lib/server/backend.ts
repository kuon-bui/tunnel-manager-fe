import "server-only";

import { backendURL, cloudflareAccessCredentials, isSameOrigin, proxyRequestInit } from "./backend-core";
import { rejectedOriginMetadata } from "./origin-diagnostics";
import { proxyResponseHeaders } from "./proxy-response";
import { deleteSessionToken, getSessionToken } from "./session";
import { upstreamErrorMetadata, upstreamRequestMetadata } from "./upstream-diagnostics";

export function requireSameOrigin(request: Request): Response | undefined {
    if (
    isSameOrigin(
      request.headers.get("origin"),
      request.headers.get("host"),
      request.headers.get("x-forwarded-host"),
      request.headers.get("x-forwarded-proto"),
      request.url,
    )
  ) {
    return undefined;
  }
  
  console.warn("origin rejected", rejectedOriginMetadata(request));
  return Response.json({ error: "forbidden" }, { status: 403 });
}

export async function proxyBackend(request: Request, path: string[], authenticated = true): Promise<Response> {
  try {
    const token = authenticated ? await getSessionToken() : undefined;
    if (authenticated && !token) return Response.json({ error: "unauthorized" }, { status: 401 });

    const url = backendURL(process.env.API_BASE_URL, path, new URL(request.url).search);
    const access = cloudflareAccessCredentials(
      process.env.CF_ACCESS_CLIENT_ID,
      process.env.CF_ACCESS_CLIENT_SECRET,
    );
    const init = await proxyRequestInit(request, token, access);
    const isLogin = !authenticated && path.length === 2 && path[0] === "auth" && path[1] === "login";
    if (isLogin) console.info("backend login request started", upstreamRequestMetadata(url, init));

    const response = await fetch(url, init);
    if (isLogin && response.status === 403) {
      console.warn("backend login upstream rejected request", await upstreamErrorMetadata(url, response));
    }
    if (response.status === 401 && authenticated) await deleteSessionToken();

    return new Response(response.body, { status: response.status, headers: proxyResponseHeaders(response.headers) });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("API_BASE_URL") || error.message.includes("Cloudflare Access"))
    ) {
      return Response.json({ error: "server configuration error" }, { status: 500 });
    }
    return Response.json({ error: "backend unavailable" }, { status: 502 });
  }
}

export async function readBackendJSON(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: response.ok ? "invalid backend response" : "backend request failed" };
  }
}
