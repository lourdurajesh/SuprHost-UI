import Link from "next/link";
import type { ListingSummary } from "@/lib/pms";
import { formatMoney } from "@/lib/dates";
import { ListingPhoto } from "./listing-media";

// Borderless card: the photo carries it; text stays quiet underneath.
export function ListingCard({ listing, currency, priority }: { listing: ListingSummary; currency: string; priority?: boolean }) {
  const meta = [
    `${listing.maxGuests} guests`,
    listing.bedrooms && `${listing.bedrooms} bedroom${listing.bedrooms === 1 ? "" : "s"}`,
    listing.bathrooms && `${listing.bathrooms} bath${listing.bathrooms === 1 ? "" : "s"}`,
  ].filter(Boolean);

  return (
    <Link href={`/stays/${listing.slug}`} prefetch={true} className="group block">
      <ListingPhoto
        image={listing.image}
        name={listing.name}
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 85vw"
        priority={priority}
        className="aspect-[4/3] rounded-2xl"
        imgClassName="transition-transform duration-700 ease-out group-hover:scale-[1.04]"
      />
      <p className="mt-4 text-sm text-ink-soft">
        {listing.city} · {listing.propertyName}
      </p>
      <h3 className="mt-1 text-2xl leading-snug tracking-tight group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
        {listing.name}
      </h3>
      <p className="mt-1 text-sm text-ink-soft">{meta.join(" · ")}</p>
      <p className="mt-3 text-base">
        <span className="text-ink">{formatMoney(listing.fromPrice, currency)}</span>
        <span className="text-ink-soft"> / night</span>
      </p>
    </Link>
  );
}
