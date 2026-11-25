import assert from "node:assert/strict";
import { test } from "node:test";

import { safeNext } from "@/lib/links";

test("after the code, a visitor only ever goes to a page of this site", () => {
  assert.equal(safeNext("/stays?guests=2"), "/stays?guests=2");
  for (const bad of [null, "", "stays", "//evil.example", "/\\evil.example", "https://evil.example", "/a\r\nSet-Cookie: x=1", "/access", "/access?next=/x"]) assert.equal(safeNext(bad), "/", String(bad));
});
