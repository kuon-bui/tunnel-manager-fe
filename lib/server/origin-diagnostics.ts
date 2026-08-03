export function rejectedOriginMetadata(request: Request): Record<string, string | null> {
  return {
    origin: request.headers.get("origin"),
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
    requestURL: request.url,
  };
}
