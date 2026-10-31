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
| PMS Website page | 760 px drawer; long single form; table on phones | Fixed: drawer fits the screen; stays are a card list on phones; the form is four collapsible groups (a failed save opens the group with the error and focuses the field); the Save bar sits above the phone tab bar. Full redesign is the Studio (v0.6) |

## Booking requires sign-in

Guests book from a signed-in account. On `/book` a new guest types their name, email and phone, gets a 6-digit email code, and confirming it creates the account (name and phone saved) and holds the dates. A returning guest sees their details prefilled. Both the BFF and the PMS check that the session matches the booking email.

## v0.1 close-out pass (2026-10-31)

Screenshots and a DOM audit (overflow, target size, labels, contrast) at 360/390/768/1024/1280/1440 on home, `/stays`, a listing, `/book`, `/checkout/[token]`, `/booking/[token]`, `/account`, sign-in, policies, 404 and the PMS Website page, with a real booking made against the live API.

| Area | Problem | Fix |
|---|---|---|
| Contrast | `--ink-soft` #7a7471 was 4.15:1 on `--sand-deep` (step numbers, notes) | `--ink-soft` #6b6562 (5.7 on white, 5.2 on sand-deep) |
| Contrast | Owner colours from the PMS could make white-on-brand buttons or accent text unreadable; default accent was 3.8:1 | `lib/colors.ts` darkens brand to ≥ 4.5:1 against white and accent against sand-deep, same hue; default accent #3f746a |
| Non-text contrast | Text inputs, price inputs and the unselected payment radio used `--line` (1.25:1) | New `--field` token #8f8985 (≥ 3:1) |
| Contrast | Placeholders at `ink-soft/70`; filter counts at 60 % opacity | Full `ink-soft`; counts at 80 % (passes on both chip states) |
| Keyboard | Account menu had `role="menu"` but no keyboard support | Menu-button pattern: focus moves in, arrows/Home/End, Escape returns focus, Tab closes |
| Keyboard | Chat panel: no Escape, focus stayed on the launcher | Focus moves to the message box; Escape closes and returns focus |
| Focus | Payment method cards hid the focused radio's ring | Card shows the focus ring (`has-[:focus-visible]`) |
| Forms | A failed checkout submit with the error field off-screen looked like nothing happened | Focus moves to the first field with an error |
| Screen readers | Calendar days read as "2026-12-14"; map pins read only a price; single-select filter chips had no state | Spoken dates; pins labelled with the stay name; `aria-pressed` on all chips |
| Targets | Header nav links and Account button 40 px; hero selects 20 px; "Change dates" link 20 px; chat buttons 32 px | 44 px (hero selects 28 px inside a larger field) |
| Layout | Confirmation page put the stay summary above "You're going…" on phones | Summary follows the confirmation there (still first on checkout) |
| Layout | Header location line truncated at 768 | Shown from `lg` up |
| Bug | Mobile menu WhatsApp link kept the `+` (`/D/g` instead of `/\D/g`) | Fixed |
| 404 | No `<title>`, no `main` landmark, arbitrary tracking | Title, `noindex`, `main`, eyebrow style |

Native `<dialog>` + `showModal()` (dates, filters, mobile menu, photo tour) was checked with the keyboard: focus moves in, Tab wraps inside, Escape closes and focus returns to the trigger.

## Still to do

- Screen-reader pass with NVDA/VoiceOver (this pass checked names, roles and states in the DOM).
- Calendar arrow-key navigation (a roving grid); today every day is a Tab stop, which works but is slow.
