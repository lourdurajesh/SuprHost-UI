import assert from "node:assert/strict";
import { test } from "node:test";
import { bookingUrl, bookUrl, mapsUrl, safePath, stayUrl, telUrl, whatsappUrl } from "@/lib/links";
import { parseShort, shortCode, shortPath } from "@/lib/short-link";

test("only a plain path on this site is followed after sign-in", () => {
  for (const ok of ["/", "/account", "/stays?city=Chennai&guests=2", "/booking/abc#top"]) assert.equal(safePath(ok), ok);
  for (const bad of ["//evil.com", "/\\evil.com", "\\\\evil.com", "https://evil.com", "javascript:alert(1)", "/\t/evil.com", "/\n/evil.com", "/a\\b", "account", "", null, undefined])
    assert.equal(safePath(bad), null, JSON.stringify(bad));
});

test("a stay's address carries only what was chosen", () => {
  assert.equal(stayUrl("sea-view"), "/stays/sea-view");
  assert.equal(stayUrl("sea-view", { checkIn: null, guests: 0 }), "/stays/sea-view");
  assert.equal(stayUrl("sea-view", { checkIn: "2026-12-01", checkOut: "2026-12-04", guests: 3 }), "/stays/sea-view?checkIn=2026-12-01&checkOut=2026-12-04&guests=3");
  assert.equal(bookUrl("id-1", { checkIn: "2026-12-01", checkOut: "2026-12-04", guests: 2 }), "/book?listing=id-1&checkIn=2026-12-01&checkOut=2026-12-04&guests=2");
  assert.equal(bookingUrl("a/b", "receipt"), "/booking/a%2Fb/receipt");
});

test("contact links work from numbers as people write them, and are absent without one", () => {
  assert.equal(whatsappUrl("+91 98450-12345", "Hello & hi"), "https://wa.me/919845012345?text=Hello%20%26%20hi");
  assert.equal(whatsappUrl("n/a"), null);
  assert.equal(whatsappUrl(null), null);
  assert.equal(telUrl("+91 98450 12345"), "tel:+919845012345");
  assert.equal(telUrl(undefined), null);
  assert.equal(mapsUrl(null), null);
});

test("a short link gives back the home, dates and guests", () => {
  const id = "2f1c0f6e-0000-4000-8000-000000000001";
  assert.deepEqual(parseShort(shortPath(id).slice(3)), { code: shortCode(id), stay: {} });
  const path = shortPath(id, { checkIn: "2026-12-30", checkOut: "2027-01-02", guests: 4 });
  assert.deepEqual(parseShort(path.slice(3)), { code: shortCode(id), stay: { checkIn: "2026-12-30", checkOut: "2027-01-02", guests: 4 } });
  // Dates the wrong way round are left out rather than shared.
  assert.equal(shortPath(id, { checkIn: "2026-12-30", checkOut: "2026-12-30" }), `/s/${shortCode(id)}`);
});

test("a tampered short link is dropped, never an error", () => {
  for (const odd of ["", "abc", "../../etc", "1k9x2ab-", "1k9x2ab-zz-0", "toolongcode-1-1"]) {
    const read = parseShort(odd);
    assert.ok(read === null || Object.keys(read.stay).length === 0, odd);
  }
});
