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

// Borderless card: the photo carries it; text stays quiet underneath.
export function ListingCard({ listing, currency, priority, addsGst }: { listing: ListingSummary; currency: string; priority?: boolean; addsGst?: boolean }) {
  return (
    <div className="relative">
      <Link href={`/stays/${listing.slug}`} prefetch={true} className="group block">
        <ListingPhoto
          image={listing.image}
          name={listing.name}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 85vw"
          priority={priority}
          className="aspect-[4/3] rounded-2xl"
          imgClassName="transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
        <p className="mt-4 flex items-center justify-between gap-3 text-sm text-ink-soft">
          <span className="truncate">
            {listing.city} · {listing.propertyName}
          </span>
          <Rating rating={listing.rating} className="shrink-0 text-ink" />
        </p>
        <h3 className="mt-1 text-2xl leading-snug tracking-tight group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
          {listing.name}
        </h3>
        {listing.tagline && <p className="mt-1 line-clamp-2 text-ink">{listing.tagline}</p>}
        <p className="mt-1 text-sm text-ink-soft">{listingFacts(listing)}</p>
        <NightlyPrice amount={listing.fromPrice} currency={currency} addsGst={addsGst} />
      </Link>
      <WishlistButton listingId={listing.id} name={listing.name} className="absolute right-3 top-3" />
    </div>
  );
}
