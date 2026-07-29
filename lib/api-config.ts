export const DOMAIN_API_BASE_URL = "/api";
export const DOMAINS_PATH = "/domains";

export interface CreateDomainInput {
  hostname: string;
  originUrl: string;
  zoneId: string;
}

export function createDomainPayload(
  hostname: string,
  originUrl: string,
  zoneId: string,
): CreateDomainInput {
  return { hostname, originUrl, zoneId };
}

export function updateOriginPayload(originUrl: string) {
  return { originUrl };
}
