# UI improvement plan (v0.1 → v0.2)

Review against the UX/UI design specification, 2026-10-31. Shared design-system issues are fixed first, then per screen.

## Findings

| Area | Problem | Status |
|---|---|---|
| Listing — booking panel | 694 px tall with an inline two-month calendar; at 1280×800 Reserve was off-screen; on phones the panel sat at the page bottom | Fixed: compact panel (~330–400 px) with dates in a dialog; sticky and capped to the viewport; below `lg` a fixed bottom bar carries price, dates and the next action |
| Dates dialog | Same layout on every screen | Fixed: bottom sheet on phones, centred on larger screens; shows busy nights and the minimum stay; opens on the chosen dates |
| Header | Buttons wrapped at 390 px; no mobile menu | Fixed: below `md`, brand + Book now + a drawer menu (nav, trips, WhatsApp, phone) |
| Chat button | Covered content and the booking bar on phones | Fixed: floating chat on desktop only; chat is in the mobile menu |
| Type | Arbitrary sizes (`text-[2.6rem]`, `[15px]`, `[11px]`, `[10px]`) | Fixed: one scale in `globals.css` (`display`, `h1`, `h2`, `h3`, `lead`, `eyebrow` ≥ 12 px); no arbitrary text sizes remain |
| Listing | Gallery ~608 px tall on desktop; specs separated by dividers that wrapped; boxed highlight grid | Fixed: gallery capped at `min(60vh, 540px)`; specs as one " · " line; highlights as a plain list |
| Checkout | Card-wrapped form; stay summary below the form on phones | Fixed: form unboxed; summary is compact and comes first on phones |
| Confirmation | Decorative circles; boxed facts and icon bubbles | Fixed: removed |
| Search | Filter bar wrapped into a tall block on phones | Fixed: one row that scrolls sideways; filters dialog is a bottom sheet on phones |
| Touch targets | Several controls < 44 px | Fixed on primary controls (min 44–48 px) |
| PMS Website page | 760 px drawer; long single form; table on phones | Partly: drawer fits the screen. Card list on phones and grouped sections are left for the Studio redesign (v0.6) |

## Booking requires sign-in

Guests book from a signed-in account. On `/book` a new guest types their name, email and phone, gets a 6-digit email code, and confirming it creates the account (name and phone saved) and holds the dates. A returning guest sees their details prefilled. Both the BFF and the PMS check that the session matches the booking email.

## Still to do

- Run the screenshot pass at 390/768/1280/1440 with the browser in view (this pass used DOM measurements at 360/390/768/1024/1280).
- PMS Website page: card list on phones; group the long form into sections.
- WCAG 2.2 AA audit: contrast of `--ink-soft` on `--sand-deep`, focus order in dialogs.
