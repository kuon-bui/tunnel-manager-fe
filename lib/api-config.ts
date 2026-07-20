export const DOMAIN_API_BASE_URL = "/api";
export const DOMAINS_PATH = "/domains";

export function updateOriginPayload(originUrl: string) {
  return { originUrl };
}
