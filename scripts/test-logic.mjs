#!/usr/bin/env node
// Bundle the TS logic-test entry with esbuild (already available via Vite) and run it in Node.
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { tmpdir } from "node:os";

const out = join(tmpdir(), `chemquiz-logic-test-${Date.now()}.mjs`);
await build({
  entryPoints: ["scripts/logic-test.entry.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node18",
  outfile: out,
  logLevel: "warning",
});
await import(pathToFileURL(out).href);
