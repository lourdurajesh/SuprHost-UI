// Lets `node --test` run the app's TypeScript as it is, with nothing to install: the "@/" alias,
// imports without an extension, JSON imports, and "server-only" (which refuses to load outside Next).
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

const src = new URL("../src/", import.meta.url);

function ownFile(specifier, parent) {
  if (specifier.startsWith("@/")) return new URL(specifier.slice(2), src);
  return /^\.{1,2}\//.test(specifier) && !parent?.includes("/node_modules/") ? new URL(specifier, parent) : null;
}

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") return { url: "data:text/javascript,", shortCircuit: true };
    const own = ownFile(specifier, context.parentURL);
    for (const ending of own ? ["", ".ts", "/index.ts"] : []) {
      const url = own.href + ending;
      if (/\.\w+$/.test(url) && existsSync(fileURLToPath(url))) return next(url, context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    return url.endsWith(".json") ? next(url, { ...context, importAttributes: { type: "json" } }) : next(url, context);
  },
});
