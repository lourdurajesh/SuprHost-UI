// Host name → site key. v0.1 reads a static map from SITE_DOMAINS so tenant resolution costs
// nothing per request; later versions replace this with the PMS `site_domains` table behind an
// edge cache. A host that is not listed is refused, never defaulted to some tenant.
//
//   SITE_DOMAINS="kaveristays.com=kaveri,www.kaveristays.com=kaveri,localhost=demo"

const SITE_KEY = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;

function parse(raw: string | undefined): Map<string, string> {
  const map = new Map<string, string>();
  for (const pair of (raw ?? "").split(",")) {
    const [host, key] = pair.split("=").map((s) => s?.trim().toLowerCase());
    if (host && key && SITE_KEY.test(key)) map.set(host, key);
  }
  return map;
}

const domains = parse(process.env.SITE_DOMAINS ?? (process.env.NODE_ENV === "production" ? "" : "localhost=demo,127.0.0.1=demo"));

export function siteKeyForHost(hostHeader: string | null): string | null {
  if (!hostHeader) return null;
  const host = hostHeader.toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
  return domains.get(host) ?? null;
}

/** All configured site keys, for build-time prerendering. */
export function allSiteKeys(): string[] {
  return [...new Set(domains.values())];
}

export function isSiteKey(value: string): boolean {
  return SITE_KEY.test(value);
}
