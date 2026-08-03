const BODY_PREVIEW_LIMIT = 512;

export function upstreamRequestMetadata(url: URL, init: RequestInit) {
  const headers = new Headers(init.headers);

  return {
    backendOrigin: url.origin,
    path: url.pathname,
    method: init.method ?? "GET",
    contentType: headers.get("content-type"),
    forwardedOrigin: headers.get("origin"),
    cloudflareAccessConfigured:
      headers.has("cf-access-client-id") && headers.has("cf-access-client-secret"),
    bodyPresent: init.body != null,
  };
}

export async function upstreamErrorMetadata(url: URL, response: Response) {
  let bodyPreview = "<unavailable>";
  let bodyTruncated = false;

  try {
    const body = await response.clone().text();
    const normalizedBody = body.replace(/[\u0000-\u001f\u007f]/g, " ");
    bodyPreview = normalizedBody.slice(0, BODY_PREVIEW_LIMIT);
    bodyTruncated = normalizedBody.length > BODY_PREVIEW_LIMIT;
  } catch {
    // Diagnostics must never change the upstream response returned to the caller.
  }

  return {
    backendOrigin: url.origin,
    status: response.status,
    contentType: response.headers.get("content-type"),
    server: response.headers.get("server"),
    cfRay: response.headers.get("cf-ray"),
    requestId: response.headers.get("x-request-id"),
    bodyPreview,
    bodyTruncated,
  };
}
