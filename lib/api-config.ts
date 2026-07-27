export const DOMAIN_API_BASE_URL = "/api";
export const DOMAINS_PATH = "/domains";

export interface CreateDomainInput {
  hostname: string;
  originUrl: string;
  path: string;
}

export function createDomainPayload(
  hostname: string,
  originUrl: string,
  path: string,
): CreateDomainInput {
  return { hostname, originUrl, path };
}

export function updateOriginPayload(originUrl: string) {
  return { originUrl };
}
