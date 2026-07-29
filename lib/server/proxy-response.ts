const RESPONSE_HEADERS = ["content-type", "cache-control", "x-accel-buffering"];

export function proxyResponseHeaders(source: Headers): Headers {
  const headers = new Headers();
  for (const name of RESPONSE_HEADERS) {
    const value = source.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}