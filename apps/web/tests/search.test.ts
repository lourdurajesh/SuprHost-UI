import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, isIsoDate, nightsBetween, overlapsBusy, stayDates } from "@/lib/dates";
import { mock } from "@/lib/pms/mock";
import type { SearchQuery } from "@/lib/pms/types";
import { describeWhen, describeWho, queryFromParams, toSearchString } from "@/lib/search-query";
import { searchParamsSchema } from "@/lib/validation";

const read = (s: string) => Object.fromEntries(Object.entries(queryFromParams(new URLSearchParams(s))).filter(([, v]) => v !== undefined));

test("a search survives the trip through the URL", () => {
  const q: SearchQuery = {
    checkIn: "2026-12-04",
    checkOut: "2026-12-06",
    flex: 2,
    guests: 4,
    children: 1,
    city: "Chennai",
    types: ["apartment"],
    amenities: ["Wi-Fi", "Air conditioning"],
    minPrice: 2000,
    sort: "price_asc",
  };
  assert.deepEqual(read(toSearchString(q)), q);
  assert.equal(toSearchString({}), "");
});

test("odd values in a shared URL are dropped by the header", () => {
  assert.deepEqual(read("checkIn=2026-02-30&checkOut=2026-03-02"), {});
  assert.deepEqual(read("checkIn=2026-12-06&checkOut=2026-12-04&flex=2"), {});
  assert.deepEqual(read("guests=-3&minPrice=abc&months=2026-13"), {});
  // Names every object has are not stay lengths.
  for (const stay of ["toString", "constructor", "__proto__"]) assert.deepEqual(read(`stay=${stay}`), {});
});

test("the server's own reading of the URL never fails", () => {
  const bad = { checkIn: "nope", guests: "999", types: "castle", bounds: "a,b", stay: "toString", flex: "9", sort: "x", months: "2026-13" };
  assert.ok(Object.values(searchParamsSchema.parse(bad)).every((v) => v === undefined));
});

test("the search bar's words", () => {
  assert.equal(describeWhen({}), "Add dates");
  assert.equal(describeWhen({ checkIn: "2026-12-04", checkOut: "2026-12-06" }), "4 Dec – 6 Dec");
  assert.equal(describeWhen({ checkIn: "2026-12-04", checkOut: "2026-12-06", flex: 1 }), "4 Dec – 6 Dec (±1)");
  assert.equal(describeWhen({ stay: "week" }), "Week, any time");
  assert.equal(describeWhen({ months: ["2026-12"] }), "Weekend in December");
  assert.equal(describeWho({ guests: 1 }), "1 guest");
  assert.equal(describeWho({}), "Add guests");
});

test("dates", () => {
  assert.equal(isIsoDate("2028-02-29"), true);
  assert.equal(isIsoDate("2026-02-29"), false);
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(nightsBetween("2026-12-30", "2027-01-02"), 3);
  assert.equal(stayDates("2026-12-01", "2026-12-06"), "1–6 Dec 2026");
  assert.equal(stayDates("2026-12-28", "2027-01-03"), "28 Dec 2026 – 3 Jan 2027");
});

test("sample data answers a flexible search with a free weekend", async () => {
  const key = "demo";
  const { hits } = await mock.search(key, { stay: "weekend" });
  const offered = hits.filter((h) => h.altCheckIn && h.altCheckOut);
  assert.ok(offered.length > 0);
  for (const h of offered) {
    const [from, to] = [h.altCheckIn!, h.altCheckOut!];
    assert.equal(new Date(`${from}T00:00:00Z`).getUTCDay(), 5, "weekends start on a Friday");
    assert.equal(nightsBetween(from, to), 2);
    assert.ok(!overlapsBusy(from, to, (await mock.availability(key, h.id, from, to)).busy), "the window is free");
  }
});
