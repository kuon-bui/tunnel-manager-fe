import type { DomainRoute } from "@/lib/api";
import type { RouteInput } from "@/lib/api-config";

export interface EditableRoute {
  key: string;
  path: string;
  originUrl: string;
  stripPrefix: boolean;
}

let routeKeySeq = 0;

export function createRouteKey(): string {
  routeKeySeq += 1;
  return `route-${routeKeySeq}`;
}

export function defaultEditableRoutes(originUrl = ""): EditableRoute[] {
  return [{ key: createRouteKey(), path: "/", originUrl, stripPrefix: false }];
}

export function editableRoutesFromDomain(routes: DomainRoute[] | undefined, fallbackOrigin = ""): EditableRoute[] {
  if (!routes?.length) return defaultEditableRoutes(fallbackOrigin);
  return routes.map((route) => ({
    key: route.id || createRouteKey(),
    path: route.path,
    originUrl: route.originUrl,
    stripPrefix: route.stripPrefix,
  }));
}

export function toRouteInputs(routes: EditableRoute[]): RouteInput[] {
  return routes.map((route) => ({
    path: route.path.trim(),
    originUrl: route.originUrl.trim(),
    stripPrefix: route.path.trim() === "/" ? false : route.stripPrefix,
  }));
}

export function validateEditableRoutes(routes: EditableRoute[]): string | undefined {
  if (!routes.length) return "Add at least one route.";
  if (routes.length > 50) return "A domain can have at most 50 routes.";

  const normalized = new Set<string>();
  let rootCount = 0;

  for (const route of routes) {
    const path = route.path.trim();
    const originUrl = route.originUrl.trim();
    if (!path) return "Each route needs a path.";
    if (!path.startsWith("/")) return `Path "${path}" must start with /.`;
    if (path.includes("?") || path.includes("#")) return `Path "${path}" cannot include ? or #.`;
    if (!originUrl) return `Route "${path}" needs an origin URL.`;

    let normalizedPath = path;
    if (normalizedPath.length > 1 && normalizedPath.endsWith("/")) {
      normalizedPath = normalizedPath.slice(0, -1);
    }
    if (normalizedPath === "/") rootCount += 1;
    if (normalized.has(normalizedPath)) return `Duplicate path "${normalizedPath}".`;
    normalized.add(normalizedPath);

    if (normalizedPath === "/" && route.stripPrefix) {
      return "Root path / cannot strip its prefix.";
    }
  }

  if (rootCount !== 1) return "Exactly one / route is required.";
  return undefined;
}
