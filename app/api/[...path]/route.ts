import { NextRequest } from "next/server";

import { proxyBackend, requireSameOrigin } from "@/lib/server/backend";

async function handler(
  request: NextRequest,
  context: RouteContext<"/api/[...path]">,
) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    const forbidden = requireSameOrigin(request);
    if (forbidden) return forbidden;
  }
  const { path } = await context.params;
  return proxyBackend(request, path);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
