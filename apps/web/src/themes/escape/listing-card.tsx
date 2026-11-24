import Link from "next/link";
import type { ListingSummary } from "@/lib/pms";
import { formatDate, formatMoney } from "@/lib/dates";
import { stayUrl, type StayChoice } from "@/lib/links";
import { listingSpecs, PROPERTY_TYPE } from "@/lib/listing-facts";
import { plural } from "@/lib/text";
import { Icon } from "@/components/icons";
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
    <div className="relative min-w-0">
      <WishlistButton listingId={l.id} name={l.name} className="absolute right-2 top-2 z-10 sm:right-3 sm:top-3" />
      <Link href={stayUrl(l.slug, stay)} prefetch={prefetch} className="group block">
        <div className="relative">
          <ListingPhoto
            image={l.image}
            name={l.name}
            sizes={sizes}
            preload={preload}
            className={`aspect-square rounded-2xl ring-2 transition ${active ? "ring-ink" : "ring-transparent"}`}
            imgClassName="transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
          {l.instantBook && (
            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-xs shadow-sm sm:left-3 sm:top-3 sm:px-3">
              <Icon name="bolt" className="h-3.5 w-3.5" /> <span className="max-sm:sr-only">Instant book</span>
            </span>
          )}
        </div>
        <Heading className="mt-3 flex items-center justify-between gap-2 text-base leading-6">
          <span className="truncate group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4" title={l.name}>
            {l.name}
          </span>
          <Rating rating={l.rating} className="shrink-0 text-sm font-normal text-ink" />
        </Heading>
        <p className="truncate text-sm leading-5 text-ink-soft">
          {l.city} · {l.propertyName}
        </p>
        <p className="truncate text-sm leading-5 text-ink-soft">
          <span className="max-sm:hidden">{PROPERTY_TYPE[l.propertyType]} · </span>
          {listingSpecs(l, ["bedrooms", "bathrooms"]).join(" · ")}
        </p>
        {free && (
          <p className="truncate text-sm font-medium leading-5 text-accent">
            <span className="max-sm:hidden">Available </span>
            {day(free.checkIn)} – {day(free.checkOut)}
          </p>
        )}
        <p className="mt-0.5 truncate leading-6">
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
      </Link>
    </div>
  );
}
