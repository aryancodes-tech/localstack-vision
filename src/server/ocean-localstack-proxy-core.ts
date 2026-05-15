/**
 * Dev proxy for Ocean LocalStack.
 *
 * Problem: The browser sends `Origin: http://localhost:PORT` which Ocean's Traefik gateway
 * rejects with 403. We proxy through the dev server to strip that header.
 *
 * Problem: Node.js cannot resolve `*.oceaninfra.localhost` via getaddrinfo (macOS split-DNS
 * quirk — curl uses the system resolver which works, but Node uses its own DNS stack that
 * doesn't consult `/etc/resolver/`). We connect to 127.0.0.1 directly.
 *
 * Problem: fetch() treats `host` as a forbidden header and silently ignores it, so Traefik
 * sees `Host: 127.0.0.1` and returns 404. We use node:http.request which allows explicit
 * Host header control.
 *
 * Solution: Connect to 127.0.0.1:80, set Host: localstack.oceaninfra.localhost, strip
 * Origin/Referer/Cookie. Confirmed working via manual curl test.
 */

import { request as httpRequest } from "node:http";
import { OCEAN_DEV_PROXY_PATH } from "../lib/aws/effective-endpoint";

const OCEAN_VIRTUAL_HOST =
  process.env.OCEAN_PROXY_VIRTUAL_HOST ?? "localstack.oceaninfra.localhost";
/** On Ocean `omnet`, use `traefik`. On the host (vite dev), use `127.0.0.1`. */
const UPSTREAM_HOST = process.env.OCEAN_PROXY_UPSTREAM_HOST ?? "127.0.0.1";
const UPSTREAM_PORT = Number(process.env.OCEAN_PROXY_UPSTREAM_PORT ?? "80");

interface ProxyResult {
  status: number;
  rawHeaders: string[];
  body: Buffer;
}

function makeRequest(
  path: string,
  method: string,
  headers: Record<string, string>,
  body: Buffer | undefined,
): Promise<ProxyResult> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      {
        hostname: UPSTREAM_HOST,
        port: UPSTREAM_PORT,
        path,
        method,
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () =>
          resolve({
            status: res.statusCode ?? 200,
            rawHeaders: res.rawHeaders,
            body: Buffer.concat(chunks),
          }),
        );
        res.on("error", reject);
      },
    );
    req.on("error", reject);
    if (body && body.length > 0) req.write(body);
    req.end();
  });
}

/**
 * If `request` targets `/__ls_ocean`, proxies to LocalStack. Otherwise returns `null`.
 * Used from `src/server.ts` and from the Vite pre-middleware plugin.
 */
export async function executeOceanLocalstackProxy(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(OCEAN_DEV_PROXY_PATH)) return null;

  // Strip the proxy prefix to get the real LocalStack path.
  const upstreamPath = (url.pathname.slice(OCEAN_DEV_PROXY_PATH.length) || "/") + url.search;

  // Forward all headers except ones that cause problems:
  //   host     — we set it explicitly to the Traefik virtual host
  //   origin   — triggers 403 from Ocean's gateway CORS policy
  //   referer  — same policy
  //   cookie   — may route to wrong service
  //   connection, content-length — hop-by-hop, node:http manages these
  const SKIP = new Set(["host", "origin", "referer", "cookie", "connection", "content-length"]);
  const forwardHeaders: Record<string, string> = { host: OCEAN_VIRTUAL_HOST };
  request.headers.forEach((value, key) => {
    if (!SKIP.has(key.toLowerCase())) forwardHeaders[key] = value;
  });

  const body =
    request.method !== "GET" && request.method !== "HEAD" && request.body
      ? Buffer.from(await request.arrayBuffer())
      : undefined;

  try {
    const result = await makeRequest(upstreamPath, request.method, forwardHeaders, body);

    // Rebuild response headers, dropping content-encoding/transfer-encoding/content-length
    // since we're re-serving the fully-buffered body.
    const SKIP_RES = new Set(["content-encoding", "transfer-encoding", "content-length"]);
    const resHeaders = new Headers();
    for (let i = 0; i < result.rawHeaders.length; i += 2) {
      if (!SKIP_RES.has(result.rawHeaders[i].toLowerCase())) {
        resHeaders.append(result.rawHeaders[i], result.rawHeaders[i + 1]);
      }
    }

    return new Response(new Uint8Array(result.body), { status: result.status, headers: resHeaders });
  } catch (e) {
    console.error(
      `[ocean-localstack-proxy] failed to reach ${UPSTREAM_HOST}:${UPSTREAM_PORT} (path: ${upstreamPath}):`,
      e,
    );
    return new Response(
      `LocalStack proxy failed.\n` +
        `Could not connect to ${UPSTREAM_HOST}:${UPSTREAM_PORT} with Host: ${OCEAN_VIRTUAL_HOST}\n` +
        `Error: ${e}`,
      { status: 502 },
    );
  }
}
