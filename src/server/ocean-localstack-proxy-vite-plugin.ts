import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { executeOceanLocalstackProxy } from "./ocean-localstack-proxy-core";

function incomingToRequest(req: IncomingMessage): Request {
  const host = req.headers.host ?? "localhost";
  const pathAndQuery = req.url ?? "/";
  const fullUrl = `http://${host}${pathAndQuery}`;
  const method = req.method ?? "GET";

  const init: RequestInit = {
    method,
    headers: req.headers as HeadersInit,
    redirect: "manual",
  };

  if (method !== "GET" && method !== "HEAD") {
    init.body = req as unknown as BodyInit;
    (init as { duplex?: "half" }).duplex = "half";
  }

  return new Request(fullUrl, init);
}

async function writeResponse(res: ServerResponse, out: Response) {
  res.statusCode = out.status;
  const skip = new Set(["content-encoding", "transfer-encoding", "content-length"]);
  out.headers.forEach((v, k) => {
    if (skip.has(k.toLowerCase())) return;
    res.setHeader(k, v);
  });
  const buf = Buffer.from(await out.arrayBuffer());
  res.end(buf);
}

/**
 * Runs before TanStack Start's HTTP pipeline so `/__ls_ocean` is not turned into a plain 404.
 */
export function oceanLocalstackProxyVitePlugin(): Plugin {
  return {
    name: "ocean-localstack-proxy-middleware",
    apply: "serve",
    enforce: "pre",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/__ls_ocean")) {
          next();
          return;
        }

        void (async () => {
          try {
            const wrapped = incomingToRequest(req);
            const out = await executeOceanLocalstackProxy(wrapped);
            if (!out) {
              next();
              return;
            }
            await writeResponse(res, out);
          } catch (e) {
            next(e);
          }
        })();
      });
    },
  };
}
