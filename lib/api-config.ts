export const DOMAIN_API_BASE_URL = "/api";
export const DOMAINS_PATH = "/domains";

export interface RouteInput {
  path: string;
  originUrl: string;
  stripPrefix?: boolean;
}

export interface CreateDomainInput {
  hostname: string;
  zoneId: string;
  routes: RouteInput[];
}

export interface ReplaceRoutesInput {
  routes: RouteInput[];
}

export function createDomainPayload(
  hostname: string,
  zoneId: string,
  routes: RouteInput[],
): CreateDomainInput {
  return { hostname, zoneId, routes };
}

export function replaceRoutesPayload(routes: RouteInput[]): ReplaceRoutesInput {
  return { routes };
}

export function selectedZoneID(current: string, zones: { id: string }[]): string {
  return zones.some((zone) => zone.id === current) ? current : zones[0]?.id ?? "";
}

/** @deprecated Prefer replaceRoutes; only updates the `/` route origin. */
export function updateOriginPayload(originUrl: string) {
  return { originUrl };
}

export function hostnameForZone(hostname: string, zoneName: string): string | undefined {
  const normalizedHostname = normalizeDNSName(hostname);
  const normalizedZone = normalizeDNSName(zoneName);
  if (!normalizedHostname || !normalizedZone) return undefined;
  if (!normalizedHostname.includes(".")) return `${normalizedHostname}.${normalizedZone}`;
  if (normalizedHostname === normalizedZone || normalizedHostname.endsWith(`.${normalizedZone}`)) {
    return normalizedHostname;
  }
  return undefined;
}

function normalizeDNSName(value: string): string {
  return value.trim().toLowerCase().replace(/\.$/, "");
}
