// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
// Use the package ESM build: `main` points at `dist/index.cjs`, which `require()`s
// ESM-only `lovable-tagger` and fails when Vite bundles the config as CJS.
import { defineConfig } from "@lovable.dev/vite-tanstack-config/dist/index.js";
import { nitro } from "nitro/vite";
import { oceanLocalstackProxyVitePlugin } from "./src/server/ocean-localstack-proxy-vite-plugin";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
// `/__ls_ocean` is proxied in `vite dev` via `oceanLocalstackProxyVitePlugin` (pre-middleware)
// so TanStack never returns a generic 404 for that path; `src/server.ts` still proxies for
// runtimes that hit the worker entry without the Vite stack.
//
// Vercel sets `VERCEL=1` during builds. TanStack Start on Vercel uses Nitro with the `vercel`
// preset (see TanStack hosting docs). Do not use `defineConfig(() => …)` here: Lovable's
// wrapper treats a function callback as returning *only* the inner Vite config, so top-level
// keys like `cloudflare` and `tanstackStart` would be ignored.
const vercelCi = process.env.VERCEL === "1";

export default defineConfig({
  cloudflare: vercelCi ? false : undefined,
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    envPrefix: ["VITE_", "LOCALSTACK_"],
    plugins: [
      ...(vercelCi ? [nitro({ preset: "vercel" })] : []),
      oceanLocalstackProxyVitePlugin(),
      // @smithy/util-buffer-from (used by @aws-sdk signing) does `import { Buffer } from "buffer"`.
      // Without this polyfill the browser bundle sees Buffer as undefined and throws on any SDK call.
      nodePolyfills({ include: ["buffer"], globals: { Buffer: true } }),
    ],
  },
});
