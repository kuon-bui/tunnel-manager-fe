import type { Domain, DomainRoute } from "@/lib/api";

export function formatRouteSummary(routes: DomainRoute[] | undefined): string {
  if (!routes?.length) return "—";
  if (routes.length === 1 && routes[0].path === "/") return "All paths → /";
  return `${routes.length} routes`;
}

export function domainView(domain: Pick<Domain, "routes" | "originUrl">) {
  const routes = domain.routes ?? [];
  const root = routes.find((route) => route.path === "/");
  return {
    routeSummary: formatRouteSummary(routes),
    rootOriginUrl: root?.originUrl || domain.originUrl || "—",
    routes,
    canManage: true,
    hasProcess: true,
  };
}
