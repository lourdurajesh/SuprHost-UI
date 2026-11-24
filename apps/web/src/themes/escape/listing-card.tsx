import Link from "next/link";
import type { ListingSummary } from "@/lib/pms";
import { formatDate, formatMoney } from "@/lib/dates";
import { stayUrl, type StayChoice } from "@/lib/links";
import { listingSpecs, PROPERTY_TYPE } from "@/lib/listing-facts";
import { plural } from "@/lib/text";
import { Rating } from "@/components/rating";
import { WishlistButton } from "@/components/wishlist";
import { ListingPhoto } from "./listing-media";

interface Trip {
  nights: number;
  total: number;
}

interface Props {
  listing: ListingSummary;
  currency: string;
  /** Nightly prices are before GST; trip totals already include it. */
  addsGst?: boolean;
  /** Dates and guests carried to the home's page. */
  stay?: StayChoice;
  /** The price of the whole trip, once dates are known. */
  trip?: Trip | null;
  /** A free window that isn't exactly the dates asked for. */
  window?: { checkIn: string; checkOut: string } | null;
  /** The home is picked out (its pin on the map has the pointer). */
  active?: boolean;
  heading?: "h2" | "h3";
  /** Above the fold: load the photo first. */
  preload?: boolean;
  sizes?: string;
  prefetch?: boolean;
}

const day = (iso: string) => formatDate(iso, { day: "numeric", month: "short" });

/** A home with a square photo, the same everywhere it is listed. The photo carries it; the text stays quiet. */
export function ListingCard({ listing: l, currency, addsGst, stay, trip, window: free, active, heading: Heading = "h3", preload, sizes = "(min-width: 1024px) 25vw, 50vw", prefetch }: Props) {
  return (
    <div className="relative h-full min-w-0">
      <WishlistButton listingId={l.id} name={l.name} className="absolute right-2 top-2 z-10 sm:right-3 sm:top-3" />
      <Link href={stayUrl(l.slug, stay)} prefetch={prefetch} className="group flex h-full flex-col">
        <div className="relative">
          <ListingPhoto
            image={l.image}
            name={l.name}
            sizes={sizes}
            preload={preload}
            className={`aspect-square rounded-2xl ring-2 transition ${active ? "ring-ink" : "ring-transparent"}`}
            imgClassName="transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        </div>
        <Heading className="mt-3 text-base leading-6 group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">{l.name}</Heading>
        <Rating rating={l.rating} className="mt-0.5 text-sm" />
        <p className="text-sm leading-5 text-ink-soft">
          {l.city} · {l.propertyName}
        </p>
        <p className="text-sm leading-5 text-ink-soft">
          <span className="max-sm:hidden">{PROPERTY_TYPE[l.propertyType]} · </span>
          {listingSpecs(l, ["bedrooms", "bathrooms"]).join(" · ")}
        </p>
        {free && (
          <p className="text-sm font-medium leading-5 text-accent">
            <span className="max-sm:hidden">Available </span>
            {day(free.checkIn)} – {day(free.checkOut)}
          </p>
        )}
        {/* Pushed to the bottom, so prices and actions line up across a row whatever the names need. */}
        <p className="mt-auto pt-1 leading-6">
          <span className="font-medium">{formatMoney(trip ? trip.total : l.fromPrice, currency)}</span>
          <span className="text-sm text-ink-soft">
            {trip ? (
              <>
                {" "}
                for {plural(trip.nights, "night")}
                <span className="max-sm:hidden">{addsGst ? " · incl. GST and fees" : " · incl. fees"}</span>
              </>
            ) : (
              <> / night{addsGst && " + GST"}</>
            )}
          </span>
        </p>
        <span className="mt-1 text-sm font-medium underline underline-offset-4">View details</span>
      </Link>
    </div>
  );
}
