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

export function isSameOrigin(origin: string | null, requestURL: string): boolean {
  return origin !== null && origin === new URL(requestURL).origin;
}

export async function proxyRequestInit(request: Request, token?: string): Promise<RequestInit> {
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  if (token) headers.set("authorization", `Bearer ${token}`);

  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();
  return { method: request.method, headers, body: body || undefined, redirect: "manual" };
}
