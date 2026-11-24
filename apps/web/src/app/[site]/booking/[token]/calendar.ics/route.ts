import { connection } from "next/server";
import { stayCalendar } from "@/lib/ics";
import { getBooking, getListing, getSite } from "@/lib/pms";
import { bookingToken } from "@/lib/validation";

// "Add to calendar" for a confirmed stay. The token in the path is the guest's link, as on the
// booking page; the file itself carries the reference and address, never that link.
export async function GET(_request: Request, ctx: RouteContext<"/[site]/booking/[token]/calendar.ics">) {
  await connection();
  const { site: key, token } = await ctx.params;
  const booking = bookingToken.safeParse(token).success ? await getBooking(key, token) : null;
  const site = await getSite(key);
  if (!booking || !site || booking.status !== "confirmed") return new Response("Not found", { status: 404 });

  // The booked home's place, not the site's contact address: that can be in another city.
  const listing = booking.listing.slug ? await getListing(key, booking.listing.slug) : null;
  const body = stayCalendar({
    uid: `${booking.reference}@${new URL(site.canonicalUrl).hostname}`,
    title: `Stay at ${booking.listing.name}, ${site.brandName}`,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    checkInTime: site.policies.checkInTime,
    checkOutTime: site.policies.checkOutTime,
    timeZone: site.timezone,
    location: listing ? [listing.name, listing.propertyName, listing.city].join(", ") : booking.listing.name,
    description:
      `Booking ${booking.reference} for ${booking.guests} guest${booking.guests === 1 ? "" : "s"}. ` +
      `Check-in from ${site.policies.checkInTime}, check-out by ${site.policies.checkOutTime}.` +
      (site.contact.phone ? ` Questions: ${site.contact.phone}.` : ""),
    url: site.canonicalUrl,
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${booking.reference}.ics"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
