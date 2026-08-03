export function backendURL(baseURL: string | undefined, path: string[], search: string): URL {
  if (!baseURL) throw new Error("missing API_BASE_URL");
  let url: URL;
  try {
    url = new URL(baseURL);
  } catch {
    throw new Error("invalid API_BASE_URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("invalid API_BASE_URL");
  if (path.some((segment) => !segment || segment === "." || segment === ".." || segment.includes("/"))) {
    throw new Error("invalid backend path");
  }
  url.pathname = `/api/${path.map(encodeURIComponent).join("/")}`;
  url.search = search;
  return url;
}

export function isSameOrigin(
  origin: string | null,
  host: string | null,
  forwardedHost: string | null,
  forwardedProto: string | null,
  requestURL: string,
): boolean {
  if (!origin) return false;

  const effectiveHost = firstForwardedValue(forwardedHost) ?? host?.trim();
  if (!effectiveHost) return false;

  let parsedOrigin: URL;
  let requestProtocol: string;
  try {
    parsedOrigin = new URL(origin);
    requestProtocol = new URL(requestURL).protocol;
  } catch {
    return false;
  }

  const forwardedProtocol = firstForwardedValue(forwardedProto);
  const effectiveProtocol = forwardedProtocol ? `${forwardedProtocol.replace(/:$/, "")}:` : requestProtocol;
  if (effectiveProtocol !== "http:" && effectiveProtocol !== "https:") return false;

  return parsedOrigin.protocol === effectiveProtocol && parsedOrigin.host.toLowerCase() === effectiveHost.toLowerCase();
}

function firstForwardedValue(value: string | null): string | undefined {
  const first = value?.split(",", 1)[0]?.trim();
  return first || undefined;
}

export function authenticatedFromBackendStatus(status: number): boolean | undefined {
  if (status === 401) return false;
  return status >= 200 && status < 300 ? true : undefined;
}

export async function proxyRequestInit(request: Request, token?: string): Promise<RequestInit> {
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  if (token) headers.set("authorization", `Bearer ${token}`);

  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();
  return { method: request.method, headers, body: body || undefined, redirect: "manual", signal: request.signal };
}
