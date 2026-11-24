import assert from "node:assert/strict";
import { test } from "node:test";
import { contrast } from "@/lib/colors";
import { groupSuggestions } from "@/lib/group-stays";
import { stayCalendar } from "@/lib/ics";
import { maskMobile, toMobile } from "@/lib/mobile";
import { customPalette, PALETTES, paletteCss } from "@/lib/palettes";
import type { ListingSummary, PublicReview } from "@/lib/pms/types";
import { ratingSpread, selectReviews } from "@/lib/reviews";
import { plural } from "@/lib/text";
import { createBookingBody, signInCodeBody } from "@/lib/validation";

test("every palette is readable: white on buttons, text on white and on the soft ground (WCAG AA)", () => {
  const custom = [customPalette("#ffee00", "#00ffcc"), customPalette("not a colour", "")];
  for (const p of [...PALETTES, ...custom]) {
    for (const fill of [p.brand, p.brand2]) assert.ok(contrast(fill, "#ffffff") >= 4.5, `${p.name} button ${fill}`);
    for (const ground of ["#ffffff", p.sandDeep])
      for (const text of [p.ink, p.inkSoft, p.accent]) assert.ok(contrast(text, ground) >= 4.5, `${p.name} text ${text} on ${ground}`);
    assert.ok(contrast(p.field, "#ffffff") >= 3, `${p.name} field outline`);
  }
});

test("only plain colours reach the stylesheet", () => {
  assert.match(paletteCss(customPalette("red;}body{display:none", "#12345")), /^:root\{(--[\w-]+:#[0-9a-f]{6};?)+\}$/i);
});

const review = (rating: number, text: string, author = "Asha") => ({ rating, text, author }) as PublicReview;

test("reviews: search, order and spread", () => {
  const all = [review(4, "Quiet home"), review(5, "Great kitchen", "Ravi"), review(2, "Noisy"), review(5, "Lovely")];
  assert.deepEqual(selectReviews(all, " KITCHEN ", "recent").map((r) => r.author), ["Ravi"]);
  assert.deepEqual(selectReviews(all, "", "high").map((r) => r.text), ["Great kitchen", "Lovely", "Quiet home", "Noisy"], "newest first among equals");
  assert.deepEqual(selectReviews(all, "", "low").map((r) => r.rating), [2, 4, 5, 5]);
  assert.deepEqual(all.map((r) => r.rating), [4, 5, 2, 5], "the list itself is not reordered");
  assert.deepEqual(ratingSpread(all).map((s) => s.count), [2, 1, 0, 1, 0]);
});

test("plurals", () => {
  assert.equal(plural(1, "guest"), "1 guest");
  assert.equal(plural(0, "guest"), "0 guests");
  assert.equal(plural(2, "match", "matches"), "2 matches");
});

test("Indian mobile numbers as people type them, read the same by browser and server", () => {
  for (const typed of ["98450 12345", "+91 98450-12345", "098450 12345", "919845012345", "0091 9845012345"]) {
    assert.equal(toMobile(typed), "+919845012345", typed);
    assert.deepEqual(signInCodeBody.parse({ mobile: typed, turnstileToken: null }), { mobile: "+919845012345", turnstileToken: null });
  }
  for (const bad of ["12345", "5845012345", "+1 415 555 0100", ""]) assert.equal(toMobile(bad), null, bad);
  assert.equal(maskMobile("+919845012345"), "+91 98450 •••45");
});

test("a booking request is refused unless it is complete and human", () => {
  const ok = {
    listingId: "2f1c0f6e-1111-4111-8111-111111111111",
    checkIn: "2026-12-01",
    checkOut: "2026-12-03",
    guests: 2,
    name: "Asha R",
    email: " Asha@Example.com ",
    phone: "098450 12345",
    elapsedMs: 4000,
    idempotencyKey: "2f1c0f6e-1111-4111-8111-111111111112",
  };
  assert.equal(createBookingBody.parse(ok).email, "asha@example.com");
  for (const bad of [{ website: "spam" }, { checkOut: "2026-12-01" }, { checkOut: "2027-06-01" }, { guests: 0 }, { email: "nope" }, { price: 1 }])
    assert.equal(createBookingBody.safeParse({ ...ok, ...bad }).success, false, JSON.stringify(bad));
});

test("a party too big for any one home is offered homes side by side", () => {
  const home = (id: string, maxGuests: number, propertyName = "Padur") => ({ id, maxGuests, propertyName, city: "Chennai" }) as ListingSummary;
  const homes = [home("a", 6), home("b", 4), home("c", 6, "Elsewhere")];
  assert.deepEqual(groupSuggestions(homes, 9).map((g) => g.stays.map((s) => s.id)), [["a", "b"]]);
  assert.deepEqual(groupSuggestions(homes, 5), [], "one home already fits");
  assert.deepEqual(groupSuggestions(homes, 30), [], "nowhere is big enough");
});

test("the calendar file uses UTC times, escapes the host's words and folds long lines", () => {
  const ics = stayCalendar({
    uid: "x",
    title: "Sea, sun; stay",
    checkIn: "2026-12-01",
    checkOut: "2026-12-03",
    checkInTime: "13:00",
    checkOutTime: "11:00",
    timeZone: "Asia/Kolkata",
    description: "Line\nnext ".repeat(20),
  });
  assert.match(ics, /DTSTART:20261201T073000Z/);
  assert.match(ics, /DTEND:20261203T053000Z/);
  assert.match(ics, /Sea\\, sun\\; stay/);
  assert.ok(ics.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75));
});
