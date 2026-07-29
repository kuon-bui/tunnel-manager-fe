import "server-only";

import { backendURL, isSameOrigin, proxyRequestInit } from "./backend-core";
import { proxyResponseHeaders } from "./proxy-response";
import { deleteSessionToken, getSessionToken } from "./session";

export function requireSameOrigin(request: Request): Response | undefined {
  if (isSameOrigin(request.headers.get("origin"), request.url)) return undefined;
  return Response.json({ error: "forbidden" }, { status: 403 });
}

export async function proxyBackend(request: Request, path: string[], authenticated = true): Promise<Response> {
  try {
    const token = authenticated ? await getSessionToken() : undefined;
    if (authenticated && !token) return Response.json({ error: "unauthorized" }, { status: 401 });

    const url = backendURL(process.env.API_BASE_URL, path, new URL(request.url).search);
    const response = await fetch(url, await proxyRequestInit(request, token));
    if (response.status === 401 && authenticated) await deleteSessionToken();

    return new Response(response.body, { status: response.status, headers: proxyResponseHeaders(response.headers) });
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("API_BASE_URL")) {
      return Response.json({ error: "server configuration error" }, { status: 500 });
    }
    if (error instanceof Error && error.message.includes("API_BASE_URL")) {
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
