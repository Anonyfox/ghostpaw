import { chmodSync, readFileSync } from "node:fs";
import { build, buildSync, context } from "esbuild";

const isWatch = process.argv.includes("--watch");
const pkg = JSON.parse(readFileSync("package.json", "utf-8"));

// Phase 1: Bundle the Preact SPA client for the browser.
// Output stays in memory — no temp files.
const clientResult = buildSync({
  entryPoints: ["src/channels/web/client/index.tsx"],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  jsx: "automatic",
  jsxImportSource: "preact",
  minify: true,
  write: false,
});
const CLIENT_JS = clientResult.outputFiles[0].text;
const BOOTSTRAP_CSS = readFileSync("node_modules/bootstrap/dist/css/bootstrap.min.css", "utf-8");

// Phase 2: Bundle the server, embedding client assets as virtual modules.
const embeddedAssets = {
  "embedded:client-js": CLIENT_JS,
  "embedded:bootstrap-css": BOOTSTRAP_CSS,
};

/** @type {import('esbuild').Plugin} */
const embeddedAssetPlugin = {
  name: "embedded-asset",
  setup(build) {
    build.onResolve({ filter: /^embedded:/ }, (args) => ({
      path: args.path,
      namespace: "embedded",
    }));
    build.onLoad({ filter: /.*/, namespace: "embedded" }, (args) => ({
      contents: `export default ${JSON.stringify(embeddedAssets[args.path])};`,
      loader: "js",
    }));
  },
};

/** @type {import('esbuild').Plugin} */
const nativePolyfillPlugin = {
  name: "native-polyfill",
  setup(build) {
    // Replace node-fetch with native fetch (Node 22+ has it built-in).
    // grammY ships with node-fetch v2 + abort-controller polyfills that
    // produce AbortSignal instances incompatible with each other when bundled.
    build.onResolve({ filter: /^node-fetch$/ }, () => ({
      path: "node-fetch",
      namespace: "native-polyfill",
    }));
    build.onResolve({ filter: /^abort-controller$/ }, () => ({
      path: "abort-controller",
      namespace: "native-polyfill",
    }));
    build.onLoad({ filter: /^node-fetch$/, namespace: "native-polyfill" }, () => ({
      contents: [
        "const f = globalThis.fetch;",
        "export default f;",
        "export const Headers = globalThis.Headers;",
        "export const Request = globalThis.Request;",
        "export const Response = globalThis.Response;",
      ].join("\n"),
      loader: "js",
    }));
    build.onLoad({ filter: /^abort-controller$/, namespace: "native-polyfill" }, () => ({
      contents: "export const AbortController = globalThis.AbortController;",
      loader: "js",
    }));
  },
};

const BANNER = [
  "#!/usr/bin/env node",
  "import { createRequire as __createRequire } from 'node:module';",
  "const require = __createRequire(import.meta.url);",
].join("\n");

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node24",
  outfile: "dist/ghostpaw.mjs",
  banner: { js: BANNER },
  plugins: [nativePolyfillPlugin, embeddedAssetPlugin],
  define: { __VERSION__: JSON.stringify(pkg.version) },
  minify: false,
  sourcemap: false,
  metafile: true,
  logLevel: "warning",
};

if (isWatch) {
  const ctx = await context(buildOptions);
  await ctx.watch();
  console.log("watching for changes...");
} else {
  const result = await build(buildOptions);
  chmodSync("dist/ghostpaw.mjs", 0o755);

  const out = Object.entries(result.metafile.outputs)[0];
  const kb = (out[1].bytes / 1024).toFixed(1);
  const clientKB = (Buffer.byteLength(CLIENT_JS) / 1024).toFixed(1);
  console.log(`built ${out[0]} (${kb} KB, client: ${clientKB} KB)`);
}
