import type { AwsConfig } from "@/store/config";

/** Same-origin path forwarded to LocalStack in dev (see src/server/ocean-localstack-proxy.ts). */
export const OCEAN_DEV_PROXY_PATH = "/__ls_ocean";

export function isOceanInfraHost(endpoint: string): boolean {
  try {
    return new URL(endpoint).hostname.endsWith("oceaninfra.localhost");
  } catch {
    return false;
  }
}

/**
 * Ocean's reverse proxy rejects browser requests that send a foreign Origin (403).
 * In dev, same-origin requests hit `src/server/ocean-localstack-proxy.ts`, which forwards
 * without those headers.
 */
export function getEffectiveAwsEndpoint(cfg: AwsConfig): string {
  if (typeof window !== "undefined" && isOceanInfraHost(cfg.endpoint)) {
    return `${window.location.origin}${OCEAN_DEV_PROXY_PATH}`;
  }
  return cfg.endpoint;
}
