import { executeOceanLocalstackProxy } from "./ocean-localstack-proxy-core";

/**
 * Worker / custom server entry. In dev, Vite pre-middleware may handle `/__ls_ocean` first.
 * Docker / Nitro node builds register `src/server/ocean-nitro-route.ts` instead.
 */
export async function oceanLocalstackDevProxy(request: Request): Promise<Response | null> {
  return executeOceanLocalstackProxy(request);
}
