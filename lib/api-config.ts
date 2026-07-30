export const DOMAIN_API_BASE_URL = "/api";
export const DOMAINS_PATH = "/domains";

export interface CreateDomainInput {
  hostname: string;
  originUrl: string;
  path: string;
  zoneId: string;
}

export function createDomainPayload(
  hostname: string,
  originUrl: string,
  path: string,
  zoneId: string,
): CreateDomainInput {
  return { hostname, originUrl, path, zoneId };
}

export function selectedZoneID(current: string, zones: { id: string }[]): string {
  return zones.some((zone) => zone.id === current) ? current : zones[0]?.id ?? "";
}

export function updateOriginPayload(originUrl: string) {
  return { originUrl };
}
