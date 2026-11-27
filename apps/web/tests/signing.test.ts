import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";

// The API checks the signature against the raw target it receives, so the website must sign
// exactly what fetch puts on the wire. A search with no filters once sent "…/search?" while
// signing "…/search", and every unfiltered search was refused.

process.env.PMS_API_URL = "https://api.example.test";
process.env.PMS_API_KEY_ID = "web-test";
process.env.PMS_API_SECRET = "s".repeat(64);

const { pmsFetch } = await import("@/lib/pms/http");
const prefix = "https://api.example.test/api/public/v1";

async function send(path: string) {
  let sent: { target: string; headers: Record<string, string> } | undefined;
  const real = globalThis.fetch;
  globalThis.fetch = (async (input: URL | string, init?: RequestInit) => {
    // What goes on the wire: href keeps a bare "?" even though URL.search reads "".
    sent = { target: String(input instanceof URL ? input.href : input).slice(prefix.length), headers: init?.headers as Record<string, string> };
    return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  try {
    await pmsFetch(path);
  } finally {
    globalThis.fetch = real;
  }
  return sent!;
}

function serverAccepts({ target, headers }: { target: string; headers: Record<string, string> }) {
  const bodyHash = createHash("sha256").update("").digest("hex");
  const expected = createHmac("sha256", process.env.PMS_API_SECRET!)
    .update(`GET\n${target}\n${headers["X-SuprHost-Timestamp"]}\n${bodyHash}`)
    .digest("base64url");
  return expected === headers["X-SuprHost-Signature"];
}

test("a call with an empty query is signed as sent", async () => {
  const sent = await send("/sites/demo/search?");
  assert.equal(sent.target, "/sites/demo/search");
  assert.ok(serverAccepts(sent));
});

test("a call with a query is signed as sent", async () => {
  const sent = await send("/sites/demo/search?guests=2&amenities=wifi%2Cac");
  assert.equal(sent.target, "/sites/demo/search?guests=2&amenities=wifi%2Cac");
  assert.ok(serverAccepts(sent));
});

test("a call with no query is signed as sent", async () => {
  const sent = await send("/sites/demo/listings");
  assert.ok(serverAccepts(sent));
});
