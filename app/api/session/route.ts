import { NextRequest } from "next/server";

import { requireSameOrigin } from "@/lib/server/backend";
import { deleteSessionToken } from "@/lib/server/session";

export async function DELETE(request: NextRequest) {
  const forbidden = requireSameOrigin(request);
  if (forbidden) return forbidden;
  await deleteSessionToken();
  return new Response(null, { status: 204 });
}
