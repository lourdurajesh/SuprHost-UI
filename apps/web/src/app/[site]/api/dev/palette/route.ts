import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { PALETTES } from "@/lib/palettes";
import { isSameOrigin } from "@/lib/security";
import { isSiteKey } from "@/lib/sites";

const HEX = /^#[0-9a-f]{6}$/i;

// Development only: "Lock in" in the palette picker. Writes the choice for this site to
// src/lib/palette.lock.json, a file that is committed and built in. Does not exist in production.
export async function POST(request: NextRequest, ctx: RouteContext<"/[site]/api/dev/palette">) {
  if (process.env.NODE_ENV !== "development") return new NextResponse(null, { status: 404 });
  const { site } = await ctx.params;
  if (!isSiteKey(site) || !isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { id?: unknown; brand?: unknown; accent?: unknown } | null;
  const file = join(/* turbopackIgnore: true */ process.cwd(), "src/lib/palette.lock.json");
  const locks = JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;

  if (body?.id === null) delete locks[site];
  else if (body?.id === "custom" && typeof body.brand === "string" && typeof body.accent === "string" && HEX.test(body.brand) && HEX.test(body.accent))
    locks[site] = { id: "custom", brand: body.brand.toLowerCase(), accent: body.accent.toLowerCase() };
  else if (PALETTES.some((p) => p.id === body?.id)) locks[site] = { id: body!.id };
  else return NextResponse.json({ error: "unknown_palette" }, { status: 400 });

  await writeFile(file, `${JSON.stringify(locks, null, 2)}\n`);
  return NextResponse.json({ ok: true });
}
