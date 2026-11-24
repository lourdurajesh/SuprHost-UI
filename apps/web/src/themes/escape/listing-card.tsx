import Link from "next/link";
import type { ListingSummary, PropertyType } from "@/lib/pms";
import { formatMoney } from "@/lib/dates";
import { Rating } from "@/components/rating";
import { WishlistButton } from "@/components/wishlist";
import { ListingPhoto } from "./listing-media";

export const PROPERTY_TYPE: Record<PropertyType, string> = {
  cottage: "Cottage",
  suite: "Suite",
  villa: "Villa",
  home: "Home",
  apartment: "Apartment",
};

/** "Cottage · 4 guests · 2 bedrooms · 2 baths": what the place is and who it fits, in one line. */
export function listingFacts(l: Pick<ListingSummary, "propertyType" | "maxGuests" | "bedrooms" | "bathrooms">) {
  return [
    PROPERTY_TYPE[l.propertyType],
    `${l.maxGuests} guest${l.maxGuests === 1 ? "" : "s"}`,
    l.bedrooms && `${l.bedrooms} bedroom${l.bedrooms === 1 ? "" : "s"}`,
    l.bathrooms && `${l.bathrooms} bath${l.bathrooms === 1 ? "" : "s"}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Nightly "from" price, labelled so guests know it is per night and whether GST is extra. */
export function NightlyPrice({ amount, currency, addsGst }: { amount: number; currency: string; addsGst?: boolean }) {
  return (
    <p className="mt-3 text-base">
      <span className="text-ink-soft">From </span>
      <span className="font-medium text-ink">{formatMoney(amount, currency)}</span>
      <span className="text-ink-soft"> / night</span>
      {addsGst && <span className="text-sm text-ink-soft"> + GST</span>}
    </p>
  );
}

// Borderless card with a square photo: the photo carries it; text stays quiet underneath.
export function ListingCard({ listing, currency, priority, addsGst }: { listing: ListingSummary; currency: string; priority?: boolean; addsGst?: boolean }) {
  return (
    <div className="relative min-w-0">
      <Link href={`/stays/${listing.slug}`} prefetch={true} className="group block">
        <ListingPhoto
          image={listing.image}
          name={listing.name}
          sizes="(min-width: 1024px) 25vw, 50vw"
          priority={priority}
          className="aspect-square rounded-2xl"
          imgClassName="transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
        <h3 className="mt-3 flex items-center justify-between gap-2 text-base leading-6">
          <span className="truncate group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4" title={listing.name}>
            {listing.name}
          </span>
          <Rating rating={listing.rating} className="shrink-0 text-sm font-normal text-ink" />
        </h3>
        <p className="truncate text-sm leading-5 text-ink-soft">
          {listing.city} · {listing.propertyName}
        </p>
        <p className="truncate text-sm leading-5 text-ink-soft">{listingFacts(listing)}</p>
        <p className="mt-0.5 truncate leading-6">
          <span className="font-medium">{formatMoney(listing.fromPrice, currency)}</span>
          <span className="text-sm text-ink-soft"> / night{addsGst && " + GST"}</span>
        </p>
      </Link>
      <WishlistButton listingId={listing.id} name={listing.name} className="absolute right-2 top-2 sm:right-3 sm:top-3" />
    </div>
  );
}
