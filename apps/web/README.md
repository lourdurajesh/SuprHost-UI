# @suprhost/web

Public booking website (Next.js 16, App Router, Cache Components). See `../../docs/ARCHITECTURE.md`.

## Run

```bash
npm install
npm run dev            # http://localhost:3000, mock PMS data, site "demo"
```

Production-mode check with mock data:

```bash
SUPRHOST_USE_MOCK=1 npx next build && npx next start
```

Environment variables: `.env.example`.

## How a request flows

1. `src/proxy.ts` maps the Host header to a site key (`SITE_DOMAINS`) and rewrites `/x` → `/{key}/x`.
2. Pages under `src/app/[site]` read the catalogue through `src/lib/pms` (cached, tag-invalidated).
3. The booking widget calls `/api/availability` and `/api/quote`; the form posts to
   `/api/booking-requests`. These handlers validate, run the anti-spam checks and forward signed
   calls to the PMS. Browsers never call the PMS directly.
