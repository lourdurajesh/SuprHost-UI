import "server-only";
import { createHash, createHmac } from "node:crypto";
import { PmsError } from "./types";

// Server-to-server transport to the HostMate public API. Every call is signed so the backend
// can refuse anything that did not come from this server (see docs/ARCHITECTURE.md §3).

const baseUrl = process.env.PMS_API_URL?.replace(/\/+$/, "");
const keyId = process.env.PMS_API_KEY_ID;
const secret = process.env.PMS_API_SECRET;

export const pmsConfigured = Boolean(baseUrl && keyId && secret);

interface CallOptions {
  method?: "GET" | "POST";
  body?: unknown;
  headers?: Record<string, string>;
}

export async function pmsFetch<T>(path: string, { method = "GET", body, headers = {} }: CallOptions = {}): Promise<T> {
  if (!pmsConfigured) throw new PmsError(503, "pms_not_configured", "PMS API is not configured");

  const payload = body === undefined ? "" : JSON.stringify(body);
  // Wall-clock seconds for the signature. performance.timeOrigin + now() rather than Date.now():
  // Next.js refuses Date.now() during prerendering, and this value is never rendered.
  const timestamp = Math.floor((performance.timeOrigin + performance.now()) / 1000).toString();
  const bodyHash = createHash("sha256").update(payload).digest("hex");
  // Sign the target exactly as it goes on the wire (URL normalisation drops an empty "?", etc.).
  const url = new URL(`${baseUrl}/api/public/v1${path}`);
  const signedPath = `${url.pathname.slice(new URL(baseUrl!).pathname.replace(/\/$/, "").length + "/api/public/v1".length)}${url.search}`;
  const signature = createHmac("sha256", secret!)
    .update(`${method}\n${signedPath}\n${timestamp}\n${bodyHash}`)
    .digest("base64url");

  const res = await fetch(url, {
    method,
    body: payload || undefined,
    headers: {
      ...headers,
      Accept: "application/json",
      ...(payload ? { "Content-Type": "application/json" } : {}),
      "X-SuprHost-Key": keyId!,
      "X-SuprHost-Timestamp": timestamp,
      "X-SuprHost-Signature": signature,
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    let code = "pms_error";
    let message = `PMS API returned ${res.status}`;
    try {
      const problem = (await res.json()) as { code?: string; title?: string };
      code = problem.code ?? code;
      message = problem.title ?? message;
    } catch {
      // Non-JSON error body; keep the generic message.
    }
    throw new PmsError(res.status, code, message);
  }
  return (await res.json()) as T;
}
