import { defineHandler } from "nitro/h3";
import { executeOceanLocalstackProxy } from "./ocean-localstack-proxy-core";

/** Nitro route for Docker / node-server builds (`/__ls_ocean/**`). */
export default defineHandler(async (event) => {
  const response = await executeOceanLocalstackProxy(event.req);
  if (response) return response;
  return new Response("Not Found", { status: 404 });
});
