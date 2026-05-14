import { executeOceanLocalstackProxy } from "./ocean-localstack-proxy-core";

/**
 * Cloudflare / worker entry: skip proxy in production builds.
 * In dev, TanStack may still answer before this runs for some requests — Vite pre-middleware
 * in `ocean-localstack-proxy-vite-plugin.ts` handles `/__ls_ocean` first when using `vite dev`.
 */
export async function oceanLocalstackDevProxy(request: Request): Promise<Response | null> {
  if (import.meta.env.PROD) return null;
  return executeOceanLocalstackProxy(request);
}
