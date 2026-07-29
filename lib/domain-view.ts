import type { Domain } from "@/lib/api";

export function domainView(domain: Pick<Domain, "managed" | "path">) {
  return {
    source: domain.managed ? "Managed" : "Cloudflare sync",
    path: domain.path || "All paths",
    canManage: domain.managed,
    hasProcess: domain.managed,
  };
}