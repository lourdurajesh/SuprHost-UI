# SuprHost architecture and engineering standards

These rules are binding for every release. A pull request that breaks one needs a written
exception in the PR description.

---

## 1. System shape

```
Guest browser ──HTTPS──▶ CDN / edge (cache, WAF, bot rules)
                              │
                              ▼
                  SuprHost-UI  (Next.js, SSR/ISR, Node)
                  ├─ pages: rendered on the server, cached at the edge
                  └─ /api/* route handlers: thin BFF (validate, Turnstile, forward)
                              │  server-to-server, signed (§3)
                              ▼
                  HostMate-Backend  (ASP.NET Core, the ONE PMS)
                  ├─ /api/tenants/{id}/...   host console (staff JWT) — unchanged
                  ├─ /api/public/...         website API (service-signed, no PII out)
                  ├─ Entitlements            plan → feature codes, enforced here
                  ├─ Booking service         the only code that creates/cancels stays
                  ├─ Plugin host             payment, notification, connector plugins
                  └─ Outbox → events → plugins / webhooks
                              │
                              ▼
                  PostgreSQL (RLS, exclusion constraint on stays)   +   public image bucket
```

- **One PMS, one data model.** SuprHost-UI owns presentation only. Availability, prices,
  reservations and guests live in the PMS. Website content (branding, theme, sections, SEO)
  lives in PMS-hosted tables owned by the "website" module and is served through the public API.
- **No second booking engine.** Public writes call the same booking service the host console uses.
- **Modular monolith.** One backend deployable with clear modules (Website, Booking, Pricing,
  Entitlements, Plugins). No microservices until a module has a real scaling or ownership reason.

## 2. Tenancy and routing

- Every request resolves a tenant from the **Host header** via `site_domains`
  (owner's domain in v0.1, `{slug}.platform` in v0.4, custom domains in v0.7). Unknown host → 404.
- Next.js middleware does the lookup (cached) and passes the tenant to server components; pages
  never take a tenant id from the query string.
- Backend: every public query is tenant-scoped and also covered by PostgreSQL row-level security.

## 3. Public API contract

- Called **only by the SuprHost-UI server**, never directly by browsers. Each call carries a
  short-lived HMAC signature (service key + timestamp + body hash) and the guest's real IP.
  The backend rejects unsigned or stale (> 60 s) calls. This keeps the API surface off the open
  internet and lets the backend rate-limit by real guest IP.
- Read endpoints (site, listings, availability, quote) are cache-friendly: `ETag`, short
  `max-age`, tag-based revalidation from the backend when data changes.
- Write endpoints (create booking, start payment) require an `Idempotency-Key`.
  Replays return the original response; different body + same key → 422.
- **Booking lifecycle:** `POST /sites/{key}/bookings` creates a `pending_payment` booking whose
  calendar block holds the dates until `holdExpiresAt` (default 15 min; the double-booking
  constraint applies to holds too). It returns a random 192-bit **secret token**, stored hashed;
  the token is the guest's only credential for `GET /bookings/{token}` and
  `POST /bookings/{token}/payments`. Payment success → `confirmed` + revenue row, one transaction.
  Expired holds are released by the background job and are invisible to availability at once.
- **Search:** `GET /sites/{key}/search?checkIn&checkOut&guests&city&minPrice&maxPrice&bedrooms&types&amenities&sort`
  returns hits (with availability and trip totals when dates are given) plus facets for the
  filter panel. The web page validates every parameter and silently drops bad ones (shared URLs
  must never error).
- **Guest accounts:** `POST /auth/code` (always 202, no account enumeration; code is 6 digits,
  10-minute expiry, 5 attempts, stored hashed), `POST /auth/verify` → opaque session token
  (stored hashed in the PMS, 30-day expiry), `GET /me`, `GET /me/trips`, `POST /auth/logout`.
  The token travels server-to-server as `X-Guest-Session`; in the browser it lives only in an
  HttpOnly, SameSite=Lax, Secure `__Host-` cookie. Pages never render session data on the server
  (the header menu fetches `/api/auth/session` after load), so every page stays cacheable. The PMS
  sets `role: "host"` and `pmsUrl` when the email belongs to a staff user of the tenant.
- Token pages (`/checkout/{token}`, `/booking/{token}`) are `noindex`, uncached, and leak no
  token via Referer (`strict-origin-when-cross-origin`). Guest email is returned masked.
- Outbound DTOs are **purpose-built**: never guest names, emails, notes, finance rows or document
  data. Availability returns busy date ranges only.
- Versioned under `/api/public/v1`. Breaking change → `v2`, old version kept for one release.
- Shared contract: OpenAPI generated from the backend, TypeScript client generated into
  SuprHost-UI (`packages/api-client`). No hand-written duplicate types.

## 4. Security standard

Target: **OWASP ASVS 4.0 Level 2** for the public site and public API, with the OWASP Top 10
as the minimum checklist for every PR. Nothing is "hacking-proof"; the standard is defence in
depth plus verification, so one mistake is never enough for a breach.

**Transport and headers (set in `next.config.ts`, verified in CI)**
- HTTPS only, HSTS `max-age=63072000; includeSubDomains; preload`.
- Static CSP: `default-src 'self'`; scripts from `'self'` and only the explicitly listed third
  parties (Turnstile now, payment plugin domains later); `frame-ancestors 'none'`,
  `base-uri 'none'`, `object-src 'none'`, `form-action 'self'`. Map tiles: `api.maptiler.com` in
  `img-src`/`connect-src`; `worker-src 'self' blob:` for MapLibre's tile worker.
- **Deliberate trade-off:** `script-src` keeps `'unsafe-inline'` (Next.js inlines its own
  hydration payload). Per-request nonces would remove it but force every page to render per request
  (no static shell, no CDN cache), which breaks §6. The risk is contained because the site renders
  no user-supplied HTML (React escaping only, JSON-LD is `<`-escaped) and loads no third-party
  script hosts beyond the allow-list. Revisit when Next.js supports hashes for its inline scripts.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy` denying camera, mic, geolocation and payment unless a plugin needs them,
  `Cross-Origin-Opener-Policy: same-origin`.
- Cookies: `Secure; HttpOnly; SameSite=Lax`, `__Host-` prefix. The public site sets no cookies in
  v0.1 except the CSRF token on the form.

**Input, output and data**
- Validate every input twice: zod at the BFF, FluentValidation in the backend (types, lengths,
  ranges, date sanity, phone/email formats). Reject unknown fields.
- EF Core parameterised queries only; no raw SQL string building.
- React escaping only; no `dangerouslySetInnerHTML`. Owner-written rich text (v0.6) is stored as
  structured blocks, not HTML.
- CSRF: double-submit token + `Origin` check on BFF POSTs.
- Images: upload only through the host console; type sniffed, re-encoded, EXIF stripped, size
  capped; served from a separate cookieless domain.
- Secrets live in the hosting provider's secret store. Never in git, never in `NEXT_PUBLIC_*`.
  The SSH keys under `SuprHosts/Keys` and `VMFiles/` must stay out of every repository.
- PII minimisation: collect name, email, phone and guest count only. Retention policy in v0.2.

**Supply chain and operations**
- Lockfiles committed; `npm audit --audit-level=high` and `dotnet list package --vulnerable`
  fail CI; Dependabot/Renovate weekly. Pin GitHub Actions by SHA.
- OWASP ZAP baseline scan against staging on every release branch.
- Audit log (already in the backend) records every public write with IP and idempotency key.
- Error responses never include stack traces or internal ids; correlation id only.
- `/.well-known/security.txt` with a contact address.
- External penetration test before v0.4 (multi-tenant sign-up) and before v1.0.

## 5. Spam and abuse standard

Layered; each layer is cheap and the combination is expensive for an attacker.

1. **Edge:** CDN bot management / WAF managed rules; block known bad ASNs on POST routes.
2. **Invisible challenge:** Cloudflare Turnstile token on every form, verified server-side by
   the BFF. Tokens are single-use, so the backend cannot re-verify; it can't be reached without
   the BFF's request signature anyway, and applies its own per-guest rate limits.
3. **Form signals:** honeypot field; minimum fill time (e.g. 3 s); signed form token tied to the
   rendered page and expiring after 30 min.
4. **Rate limits (backend, real guest IP):** per IP, per email, per phone, per listing, and
   per tenant per hour; a cap on open Pending requests per contact (e.g. 2).
5. **Content checks:** disposable-email blocklist, phone/email format and country sanity, guest
   count ≤ unit capacity, stay length within limits, no dates in the past or > 18 months out.
6. **Verification (v0.2):** OTP to email or phone before anything holds inventory.
7. **Feedback loop:** host can mark a request as spam in the PMS; that feeds the blocklists.

Spam gate for a release: scripted test that floods the form (no token, replayed token, rapid
submissions, honeypot filled) results in **zero** requests reaching the host inbox.

## 6. Performance standard

**Budgets (enforced by Lighthouse CI on every PR; mobile, simulated 4G, mid-range device)**

| Metric | Budget |
|---|---|
| LCP | ≤ 2.0 s (p75 real users ≤ 2.5 s) |
| INP | ≤ 200 ms |
| CLS | ≤ 0.05 |
| TTFB, cached page | ≤ 200 ms |
| JS shipped, listing page | ≤ 150 KB gzip total, of which app code ≤ 30 KB (React + Next.js runtime is ~115 KB and fixed) |
| Lighthouse Performance / SEO / Accessibility | ≥ 95 / 100 / 95 |
| Public API p95 (read / write) | ≤ 150 ms / ≤ 400 ms |

**How**
- React Server Components by default; client components only for interactive islands (date
  picker, form, gallery). No UI kit; Tailwind with design tokens.
- Pages statically generated and revalidated by tag (`site:{tenant}`, `listing:{id}`) when the
  owner or PMS changes data. Availability and quotes are fetched as small dynamic islands, so
  pages stay cacheable.
- Images: responsive AVIF/WebP variants generated at upload, `next/image` with explicit sizes,
  hero preloaded, everything else lazy. Fonts self-hosted via `next/font`, subset, `swap`.
- Third-party scripts loaded only on the page that needs them (Turnstile on the form page,
  payment SDK on checkout).
- Backend: indexes for availability ranges, response compression, output caching for public
  reads, no N+1 (EF split queries reviewed).
- Real-user monitoring of Core Web Vitals from v0.1.

**Hosting note.** Guests and the owner are in India; the API currently runs on Render. Put the
Next.js app and its edge cache in or near the Mumbai region and keep the API in the same region,
or SSR latency to the API will eat the TTFB budget. Decide before v0.1 goes live.

## 7. Entitlements (plans → features)

- **One definition file per side, generated from one source:** `entitlements.json` in the backend
  defines feature codes and plans; the backend loads it and the frontend receives the resolved
  feature set for the tenant from `GET /api/public/v1/site` (public site) and the host session
  (console).
- Backend enforcement: `[RequireFeature("website.public")]` on controllers / MediatR pipeline
  behaviour on commands. Frontend: `hasFeature()` controls navigation and UI only; it is never the
  security boundary.
- Tenant entitlements = union of features of all active subscriptions (Product A, Product B plan,
  add-ons) + tenant overrides. No `if (plan == "x")` anywhere else in the code.
- Plugins declare the feature code they need; a disabled feature disables the plugin.
- Limits (properties, units, images, requests/month) are entitlements with numeric values.

## 8. Plugin architecture

Goal: Shopify-style extensibility for payments, messaging, PMS/channel connectors and future
features, without letting third-party code weaken security.

**Three tiers, introduced in order**

| Tier | Runs where | Who writes it | When |
|---|---|---|---|
| 1. First-party plugins | In-process, compiled in, behind interfaces | Us | v0.3 |
| 2. Webhooks | Partner's server, receives signed events | Anyone | v0.3 |
| 3. Apps | Partner's server, calls OAuth-scoped App API + webhooks | Reviewed partners | v1.x |

Third-party code **never runs inside our process or our pages' main origin**. If an app needs
UI, it gets a sandboxed iframe slot on a separate origin.

**Extension points (backend interfaces, in a `HostMate.Plugins.Abstractions` project)**
- `IPaymentProvider` — create payment, verify webhook, capture, refund, supported methods/currencies.
  Result is `succeeded`, `failed`, or `requires_action` with an `https` redirect to the gateway's
  page. v0.1 ships one built-in provider, **`simulated`** (confirms without charging; booking is
  flagged "payment arranged with host"); Razorpay replaces it per tenant in v0.3. Simulated mode
  is shown to guests as "Test mode" so nobody believes they were charged.
- `INotificationChannel` — email, SMS, WhatsApp delivery of templated messages.
- `IInventoryConnector` — import/export availability, rates and reservations with an external
  PMS or channel manager, always syncing **into** the one PMS model (HostMate stays the source
  of truth for SuprHost sites).
- `IPricingRule` — contributes line items to a quote (fees, discounts, taxes, coupons).
- Event subscribers — react to outbox events (`booking.*`, `payment.*`, `guest.*`).

**Plugin lifecycle**
- Each plugin has a manifest: id, version, required feature code, config schema, required
  permissions/scopes, CSP domains it needs.
- `tenant_plugins` stores enabled state, version and **encrypted** config (API keys) per tenant.
- Plugins never touch the database directly; they get scoped services from the host.
- Webhooks from providers are verified by the plugin (signature) and processed idempotently.

**Frontend slots**
- Themes render a fixed set of **sections** (v0.5) and a fixed set of **slots** (checkout
  payment step, post-booking, footer badges). A plugin contributes a component to a slot; the
  slot API is the only way plugin UI reaches the page.

## 9. Repository layout (SuprHost-UI)

```
SuprHost-UI/
  apps/
    web/                     Next.js 16 public site (later also /studio)
      src/proxy.ts           Host header → tenant; rewrites to the internal /[site] segment
      src/app/[site]/        pages, sitemap.xml, robots.txt, BFF route handlers (api/*)
      src/lib/pms/           the only code that talks to the PMS (signed calls, cached reads, dev mock)
      src/lib/security.ts    rate limits, origin check, Turnstile, disposable-email list
      src/lib/validation.ts  zod schemas shared by form and handlers
      src/themes/escape/     theme components (atelier, estate in v0.5)
      src/components/        theme-independent interactive islands (calendar, booking widget, form)
  docs/
```

npm. Shared packages (`packages/api-client`, `packages/ui`, `packages/themes`) and an npm
workspace are introduced when the second consumer appears (Studio or mobile), not before.

## 10. Database

**One PostgreSQL database, shared with the PMS.** Website-owned tables live in their own
`website` schema; operational tables stay in `public`. SuprHost-UI has no database credentials at
all; only HostMate-Backend connects.

| `public` (PMS, source of truth) | `website` (Website Platform) |
|---|---|
| tenants, properties, units, bookings, calendar_blocks, guests, prices, revenues | sites, site_domains, site_pages/sections, listing_content (descriptions, amenities, images), seo, published_snapshots, tenant_plugins |

- Same tenant id, same row-level security, same migrations pipeline, same backups.
- Website tables reference PMS rows by `(tenant_id, id)` foreign keys, so a unit can't be deleted
  out from under its listing page and a tenant can never point at another tenant's unit.
- The public API reads both schemas in one query and one transaction (availability + content);
  no sync jobs, no eventual consistency, no second source of truth for a booking.
- Split only if a measured reason appears (e.g. website reads dominating DB load): first a read
  replica for public reads, and only then a separate database for the `website` schema.

## 11. Testing and CI gates (per PR)

- Type check, lint, unit tests, build.
- Playwright: happy-path request flow, clash (409), validation, spam cases.
- Lighthouse CI budgets (§6) and header check (§4).
- Backend: existing tests + public API contract tests + a concurrency test (two parallel
  requests for the same nights → exactly one succeeds when instant book arrives in v0.2).
