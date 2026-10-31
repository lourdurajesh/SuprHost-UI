# SuprHost roadmap

Releases are grouped by version. Each version has one branch per repository and ships as a tag.

| Repository | Branch while in progress | Released as |
|---|---|---|
| `SuprHost-UI` | `release/vX.Y` | merge to `main`, tag `vX.Y.0` |
| `HostMate-Backend` | `release/suprhost-vX.Y` | merge to `master`, tag `suprhost-vX.Y.0` |

Fixes after a release go to `release/vX.Y`, are tagged `vX.Y.1`, `vX.Y.2`, … and merged forward.
A version is only "done" when its **exit criteria** pass, including the security, spam and
performance gates in `ARCHITECTURE.md`.

> `release/suprhost-v0.1` is cut from `saas/hardening` (not `master`) because it already contains
> the double-booking constraint, row-level security, booking create/cancel as a service, rate
> limiting and CI. `saas/hardening` must land on `master` before `suprhost-v0.1.0` is tagged.

---

## v0.1 — First cut: one live site (the owner's own properties)

Goal: a fast, secure, spam-resistant public site for **one tenant**, built on the multi-tenant
foundations so nothing is thrown away later. No customisation UI.

**Backend (`release/suprhost-v0.1`)**
- Tenant site fields: `slug`, `site_published`, `site_config` (jsonb: brand name, logo, colours,
  contact, policies, `theme`), plus a `site_domains` table (domain → tenant).
- Listing fields on property/unit: public slug, description, amenities, house rules, lat/lng,
  ordered images. Public image bucket (separate from ID documents), resized variants.
- Entitlement core (code-defined plans → feature codes) with `[RequireFeature]`; the one tenant
  gets the `direct` plan. Public endpoints check `website.public`.
- Public API, server-to-server only (see Architecture §3): site, listings, availability
  (busy ranges only), server-side quote, **create booking (holds dates for 15 min)**, booking by
  secret token, **start payment**.
- **Paid booking from day one:** booking + calendar block created as `pending_payment` with a
  hold expiry; expired holds release automatically; payment success confirms the booking and
  records revenue in the same transaction (`OTAChannel.Direct`).
- **Payment step behind the payment-plugin contract** (`IPaymentProvider`, Architecture §8) with
  one built-in provider, `simulated`: accepts and confirms without charging, and the booking is
  marked "payment arranged with host". No gateway integration in v0.1.
- Idempotency keys on every public write; 409 on clash; anti-spam pipeline (Architecture §5).
- Guest + host email: "booking confirmed" (one provider, behind the notification interface).

**Web (`release/v0.1`)**
- Next.js (App Router, SSR/ISR, TypeScript, Tailwind), one polished theme: **Escape** (airy,
  editorial; fixed section order: hero with search, statement, homes carousel, highlights, story,
  gallery, guest reviews, FAQ).
- Pages: home; **`/stays` search** (dates, guests, location, price, bedrooms, type, amenities,
  sort; list + price-pin map; list/map toggle on phones; state in the URL); listing (photo
  carousel + photo tour, section tabs, amenities, things to know, area map, other stays, mobile
  booking bar; dates/guests carried from search); checkout (details → payment with hold
  countdown → confirmation); **sign-in** (email code) and **My trips**; policies; 404.
- **Guest accounts:** passwordless email code; session cookie (HttpOnly, opaque PMS token); My
  trips lists every booking made with that email; hosts (staff of the tenant in the PMS) get
  **Open PMS** in the header and on My trips.
- **Chat:** floating panel with quick questions that hands off to WhatsApp with the page context.
- Maps: MapLibre + MapTiler, downloaded only when a map scrolls into view.
- SEO: per-page metadata, Open Graph, JSON-LD (`LodgingBusiness`, `Accommodation`), sitemap, robots.
- Security headers + static CSP, Turnstile on checkout and sign-in, honeypots.

**Host side (`HostMate-UI`, small)**
- Photos, description and amenities on properties/units; paid direct bookings appear in the
  calendar like any other booking, tagged Direct.
- Site settings for v0.1 can be seeded (no settings screen required).

**Exit criteria**
- A guest on the owner's domain books and "pays" end to end; the booking appears confirmed in
  the PMS calendar and the dates disappear on the site immediately.
- Security gate, spam gate and performance budget (Architecture §4–§6) all pass.
- Running in production for 2 weeks with no P1 issues.

## v0.2 — Trust, conversation and pricing

- **On-site chat relayed to WhatsApp** (WhatsApp Business Cloud API): guests chat in the panel or
  My trips, the host gets it on WhatsApp, replies come back to the site; threads stored in the
  PMS against the guest/booking. (WhatsApp itself cannot be embedded in a website.)
- **Reviews and ratings**: post-stay review request by email, rating summary on listings and
  search cards, host replies.
- **Wishlists** (saved stays) for signed-in guests; recently viewed.
- **Manage booking** from My trips: cancel per policy, change dates (re-quote), receipts/invoices.
- Guest verification before a hold for guests who aren't signed in: email or phone OTP.
- iCal **export** per unit, so OTAs see direct bookings.
- Quote v2: custom/seasonal prices, min/max stay, cleaning and extra-guest fees, GST shown
  upfront on search cards and listing.
- Search v2: date-range calendar in the search bar, flexible dates, "search as I move the map".
- Add-to-calendar file and printable confirmation.

### Booking-site must-haves (benchmark: Airbnb, Booking.com) and where they land

| Capability | Status |
|---|---|
| Search by place, dates, guests; filters; sort; map with price pins | v0.1 |
| Rich listing: photo tour, amenities, rules, cancellation, area map | v0.1 |
| Clear total price before paying; instant confirmation; secure payment | v0.1 (simulated), v0.3 real gateway |
| Guest account, trip history, booking details | v0.1 |
| Talk to the host | v0.1 hand-off, v0.2 on-site chat |
| Reviews and ratings | v0.2 |
| Wishlists, recently viewed | v0.2 |
| Self-serve cancel / change, invoices | v0.2 |
| Taxes and fees upfront | v0.2 |
| Multi-currency, multi-language | v1.x |
| Loyalty / repeat-guest discounts, coupons | v1.x (pricing-rule plugin) |

## v0.3 — Plugin platform + real payments

- Plugin host, plugin registry, per-tenant `tenant_plugins` (enabled, version, encrypted config).
- Domain-event outbox (`booking.created`, `booking.confirmed`, `booking.cancelled`, `payment.*`).
- **Razorpay** as the first real payment plugin (UPI, cards, net banking), replacing `simulated`
  for tenants who enable it: `requires_action` + redirect, webhook-confirmed, refunds on cancel.
  The web checkout already handles this contract; no page changes needed.
- Pay-at-property and part-payment (deposit) as built-in methods.
- Signed outbound webhooks (first public extension point).

## v0.4 — Plans and multi-tenant onboarding

- Plan catalogue: Direct (Product A), PMS tiers (Product B), combined; entitlements enforced
  across existing PMS screens and API.
- Self-serve tenant sign-up for Direct; platform subdomains `{slug}.suprhost…` with wildcard TLS.
- Usage limits per plan (properties, units, images, monthly requests).
- External penetration test before opening sign-ups.

## v0.5 — Themes

- Section registry + content model shared by all themes; **Atelier** and **Estate** added.
- Theme switch keeps all content. Visual regression tests per theme.

## v0.6 — Website Studio

- Owner interface at `/studio`: branding, homepage sections, pages, SEO fields, image manager.
- Draft → preview → publish (immutable published snapshots, instant cache purge).

## v0.7 — Custom domains

- Bring-your-own domain: DNS verification, automatic TLS, canonical redirects.

## v1.0 — General availability

- SLA-grade monitoring, backups/restore drills, status page, docs, billing integration.

## v1.x — Ecosystem

- More payment plugins (Stripe, PayPal, PhonePe), messaging (WhatsApp, SMS), reviews, upsells
  and add-ons, coupons, analytics.
- Third-party PMS / channel-manager connectors.
- Partner apps: OAuth-scoped App API + webhooks (Shopify-style), app review process.
