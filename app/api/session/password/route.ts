import { NextRequest } from "next/server";

import { proxyBackend, readBackendJSON, requireSameOrigin } from "@/lib/server/backend";
import { setSessionToken } from "@/lib/server/session";

interface TokenResponse {
  token: string;
  expiresAt: string;
}

export async function PUT(request: NextRequest) {
  const forbidden = requireSameOrigin(request);
  if (forbidden) return forbidden;

  const response = await proxyBackend(request, ["auth", "password"]);
  const data = await readBackendJSON(response);
  if (!response.ok) return Response.json(data, { status: response.status });
  if (!isTokenResponse(data)) return Response.json({ error: "invalid backend response" }, { status: 502 });

  await setSessionToken(data.token, data.expiresAt);
  return Response.json({});
}

function isTokenResponse(data: unknown): data is TokenResponse {
  return Boolean(
    data &&
      typeof data === "object" &&
      typeof (data as TokenResponse).token === "string" &&
      typeof (data as TokenResponse).expiresAt === "string",
  );
}
