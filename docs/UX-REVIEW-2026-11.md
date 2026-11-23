# Customer site UX review (2026-11-19)

Scope: the guest-facing site for one host (Kaveri Stays, Escape theme). No theme system, tenant
resolution or booking-logic changes. Reviewed at 1440×900 and 390×844 on home, `/stays` (with and
without dates and filters), a listing (with dates), `/book`, payment, confirmation and My trips, with
two real bookings made end to end against the local API after the changes.

The earlier passes in `UI-IMPROVEMENT-PLAN.md` (type scale, contrast, touch targets, compact booking
panel, mobile booking bar, dialogs) still hold and were not redone.

## What was changed (branch `ux/site-polish`)

Ordered by expected effect on bookings.

| # | Screen | Problem | Change |
|---|---|---|---|
| 1 | Home hero | Photo squeezed into the right 42 % with a white fade; on phones the first screen had no photo at all, only text and a form | Full-bleed photo behind the headline on every screen size, with scrims that keep white text readable; location eyebrow above the headline |
| 2 | Home search | Small (14 px values, 576 px wide), button said only "Search" | Wider bar (768 px), 16 px values, labelled "Search stays →" button at 48 px tall |
| 3 | Home "Our homes" | Carousel showed 3 of 9 homes; the rest needed paging | Grid of up to 6, a "See all N stays" button below, and one line saying prices are per night with fees and GST shown once dates are picked |
| 4 | Cards (home, related, search) | Type of place missing; "₹4,500 / night + GST" with no hint it is a starting price; with dates, the card showed only a trip total | Facts line starts with the type ("Cottage · 4 guests · 2 bedrooms · 2 baths"); undated price reads "From ₹4,500 / night + GST"; dated price shows the trip total and the average per night, saying it includes GST and fees |
| 5 | Search map | Pins showed nightly prices while the cards beside them showed trip totals | Pins show the same figure as the card |
| 6 | Search filters | Applied filters were only a number on the Filters button; removing one meant reopening the dialog | Removable chips for each applied filter, plus "Clear filters" when more than one is on |
| 7 | Listing gallery (desktop) | One photo at a time in a carousel | Mosaic of the large photo plus four. Phones and tablets keep the swipeable carousel |
| 7a | Photo viewer | "Show all photos" opened a long scrolling grid: several clicks and scrolls to see a given photo | Any photo (mosaic tile, phone carousel slide or "Show all") opens a full-screen slideshow at that photo: previous/next arrows, ← → keys, swipe, a thumbnail strip to jump to any photo, a counter and captions; mouse-wheel zoom around the pointer (up to 4×), drag to move a zoomed photo, double-click and + / − / 0 to zoom; Esc closes |
| 7b | Listing layout (desktop) | The 540 px gallery pushed the booking card below the fold; at 1440×900 only half of it showed on load | Photos moved into the left column; the booking card starts at the top (173–619 px), fully visible at 1440×900 and 1366×768, and stays sticky |
| 7c | Listing section tabs | On phones the tab row sat 24 px below the header with a gap, the last tab was cut off with no hint of more, and nothing showed which section was in view | Tabs sit flush under the header, the section in view is underlined and scrolled into view in the row, a fade marks more tabs to the right, and "Book" is desktop only (phones book from the pinned bar) |
| 8 | Listing header | Facts as a grey " · " line; type of place not stated | "Cottage in Srirangapatna · Kaveri Riverside" eyebrow; facts as an icon row (guests, bedrooms, beds, bathrooms) |
| 9 | Booking pages | Header "Book now" and the footer's "Talk to us before you book" competed with paying, and "before you book" read wrongly on the confirmation page | Both are hidden on `/book`, payment and confirmation (CSS keyed off the step indicator, so no hydration risk under the host rewrite) |
| 9a | Payment (phones) | The Pay button came after the stay summary, about 1,300 px down | The Pay button (with the total) is pinned to the bottom of the screen on phones and tablets |
| 10 | Home | Boxed four-tile feature grid (template look); a second "Our story" pill under the statement pointed at the section right below | Open editorial row of highlights; duplicate pill removed |

## Functional issues found

| # | Issue | Status |
|---|---|---|
| F1 | Listing "Where you'll be" appended the host's town to every stay ("Ooty · Srirangapatna, near Mysuru") and fell back to the host's map pin for stays elsewhere | **Fixed**: shows the stay's own town; the host pin is used only for a stay in the same town |
| F2 | Phones: the result count sat inside the sideways-scrolling filter row, so it was off-screen | **Fixed**: count and filter chips on their own row |
| F3 | Map pin prices disagreed with card prices once dates were chosen | **Fixed** (change 5) |
| F4 | Signed-out visitors call `/api/wishlist` on every page and get a 401 (console error, wasted request) | Open: skip the call when there is no guest session |
| F5 | Backend search query uses Skip/Take without OrderBy (EF warning): result order can change between pages | Open, backend (`PublicSiteController.Search`) |
| F6 | A seeded SVG placeholder ("New verandah photo") is served as a real listing photo and now appears in the mosaic | Content: the host should replace it; optionally leave SVG placeholders out of the mosaic |

## Recommended next (not done)

| Priority | Recommendation | Why |
|---|---|---|
| High | Hero promise vs inventory: the tagline says "riverside homes near Mysuru" but the host also lists Ooty, Wayanad, Madikeri and Chikmagalur | Positioning should match what guests find (host content, editable in the PMS Website page) |
| Medium | Reviews: show the review count and an average with the dates of stay on cards and the home page; label home-page testimonials as quotes from past guests and link to the verified reviews | Trust; testimonials are host-entered, reviews are verified, and the two should not be confused |
| Medium | Group amenities into categories once a stay lists more than about 12 | Scanability; today's stays list 8–10, so a flat list is fine for now |
| Medium | About section photo (a resort pool) does not match the "family place" story | Credibility; host content |
| Low | Testimonial band: lighter background than full charcoal | Calmer, more in keeping with the rest of the page |
| Low | Calendar arrow-key navigation (carried over from the earlier plan) | Keyboard efficiency |
