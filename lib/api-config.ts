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
