import { NextRequest } from "next/server";

import { proxyBackend, requireSameOrigin } from "@/lib/server/backend";
import { authenticatedFromBackendStatus } from "@/lib/server/backend-core";
import { deleteSessionToken } from "@/lib/server/session";

export async function GET(request: NextRequest) {
  const response = await proxyBackend(request, ["domains"]);
  await response.body?.cancel();
  const authenticated = authenticatedFromBackendStatus(response.status);
  return authenticated === undefined
    ? Response.json({ error: "backend unavailable" }, { status: 503 })
    : Response.json({ authenticated });
}

export async function DELETE(request: NextRequest) {
  const forbidden = requireSameOrigin(request);
  if (forbidden) return forbidden;
  await deleteSessionToken();
  return new Response(null, { status: 204 });
}
