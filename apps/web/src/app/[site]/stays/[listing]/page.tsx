import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Carousel } from "@/components/carousel";
import { BookingWidget } from "@/components/booking-widget";
import { amenityIcon, Icon } from "@/components/icons";
import { PhotoTour } from "@/components/photo-tour";
import { SectionTabs } from "@/components/section-tabs";
import { CalendarSlot } from "@/components/calendar-slot";
import { MoreDialog } from "@/components/more-dialog";
import { ShareButton } from "@/components/share-button";
import { Rating } from "@/components/rating";
import { ReviewItem } from "@/components/review-item";
import { ReviewsDialog } from "@/components/reviews";
import { buttonClass } from "@/components/ui/button";
import { groupAmenities } from "@/lib/amenity-groups";
import { relatedStays } from "@/lib/related-stays";
import { Track } from "@/components/track";
import { StaysMap } from "@/components/stays-map";
import { TrackRecentView, WishlistButton } from "@/components/wishlist";
import { getListing, getListings, getSite } from "@/lib/pms";
import { listingSpecs, PROPERTY_TYPE } from "@/lib/listing-facts";
import { telUrl, whatsappUrl } from "@/lib/links";
import { plural } from "@/lib/text";
import { ListingCard } from "@/themes/escape/listing-card";
import { ListingPhoto } from "@/themes/escape/listing-media";
import { Suspense } from "react";

export async function generateStaticParams({ params }: { params: { site: string } }) {
  const listings = await getListings(params.site);
  return listings.map((l) => ({ listing: l.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[site]/stays/[listing]">): Promise<Metadata> {
  const { site, listing: slug } = await params;
  const listing = await getListing(site, slug);
  if (!listing) return {};
  const description = `${listing.tagline}. ${listing.description}`.slice(0, 160);
  return {
    title: listing.name,
    description,
    alternates: { canonical: `/stays/${listing.slug}` },
    openGraph: {
      title: listing.name,
      description,
      images: listing.images.slice(0, 1).map((i) => ({ url: i.url, width: i.width, height: i.height, alt: i.alt })),
    },
  };
}

async function ListingPageContent({ params }: Pick<PageProps<"/[site]/stays/[listing]">, "params">) {
  const { site: key, listing: slug } = await params;
  const [site, listing, all] = await Promise.all([getSite(key), getListing(key, slug), getListings(key)]);
  if (!site || !listing) notFound();

  const photos = listing.images.length ? listing.images : listing.image ? [listing.image] : [];
  const others = relatedStays(listing, all, 4);
  const rules = [...new Set([...site.policies.houseRules, ...listing.houseRules])];
  const specs = listingSpecs(listing);
  const kind = PROPERTY_TYPE[listing.propertyType];
  const bedrooms = listing.images.filter((i) => i.category === "bedroom").slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Accommodation",
    name: listing.name,
    description: listing.description,
    occupancy: { "@type": "QuantitativeValue", maxValue: listing.maxGuests },
    ...(listing.bedrooms ? { numberOfBedrooms: listing.bedrooms } : {}),
    ...(listing.bathrooms ? { numberOfBathroomsTotal: listing.bathrooms } : {}),
    amenityFeature: listing.amenities.map((a) => ({ "@type": "LocationFeatureSpecification", name: a, value: true })),
    ...(photos.length ? { image: photos.map((i) => new URL(i.url, site.canonicalUrl).toString()) } : {}),
    containedInPlace: { "@type": "LodgingBusiness", name: site.brandName, url: site.canonicalUrl },
    ...(listing.rating && listing.rating.count > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: listing.rating.average, reviewCount: listing.rating.count, bestRating: 5, worstRating: 1 } }
      : {}),
  };
  const reviews = listing.reviews ?? [];
  const amenityGroups = groupAmenities(listing.amenities);
  const { whatsapp } = site.contact;
  const messageHref = whatsappUrl(whatsapp, `Hello! I'm looking at ${listing.name}.`);
  const callHref = telUrl(site.contact.phone);
  // The site's own pin stands in only for a stay in the same town; elsewhere it would mislead.
  const mapAt =
    listing.location ?? (site.location && site.location.label.toLowerCase().includes(listing.city.toLowerCase()) ? site.location : null);

  const section = "border-t border-line py-8 lg:py-12";
  const amenity = (a: string) => (
    <li key={a} className="flex items-center gap-4">
      <Icon name={amenityIcon(a)} className="h-6 w-6 shrink-0" strokeWidth={1.4} /> {a}
    </li>
  );
  const host = site.brandName.charAt(0);

  return (
    // data-listing-page: the header scrolls away here and the section bar takes its place (globals.css).
    <article data-listing-page className="mx-auto max-w-[1152px] px-4 pb-28 sm:px-6 md:pb-10">
      <Track step="stay" listing={listing.id} />
      <TrackRecentView stay={{ slug: listing.slug, name: listing.name, place: listing.city, image: listing.image, fromPrice: listing.fromPrice }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <SectionTabs
        fromPrice={listing.fromPrice}
        currency={site.currency}
        addsGst={site.pricesAddGst}
        tabs={[
          { id: "photos", label: "Photos" },
          ...(listing.amenities.length ? [{ id: "amenities", label: "Amenities" }] : []),
          ...(reviews.length ? [{ id: "reviews", label: "Reviews" }] : []),
          ...(mapAt ? [{ id: "location", label: "Location" }] : []),
          { id: "things", label: "Things to know" },
        ]}
      />

      {/* Title and actions above the photos; on phones the photos come first, with the actions on them. */}
      <div className="flex items-center justify-between gap-6 pt-6 pb-4 max-sm:hidden">
        <h1 className="min-w-0 text-[1.625rem] leading-tight">{listing.name}</h1>
        <div className="-mr-3 flex shrink-0">
          <ShareButton listingId={listing.id} name={listing.name} facts={`${kind} in ${listing.city} · ${specs.slice(1, 3).join(" · ")}`} image={listing.image} />
          <WishlistButton listingId={listing.id} name={listing.name} variant="text" />
        </div>
      </div>

      <div id="photos" className="relative max-sm:-mx-4">
        <div className="absolute right-4 top-4 z-10 flex gap-2 sm:hidden">
          <ShareButton listingId={listing.id} name={listing.name} facts={`${kind} in ${listing.city}`} image={listing.image} variant="icon" />
          <WishlistButton listingId={listing.id} name={listing.name} />
        </div>
        <PhotoTour images={photos} name={listing.name}>
          {photos.length > 0 ? (
            <>
              <div className={photos.length >= 5 ? "md:hidden" : ""}>
                <Carousel label={`Photos of ${listing.name}`} slideClassName="w-full" gapClassName="gap-0" counter className="overflow-hidden sm:rounded-2xl">
                  {photos.map((img, i) => (
                    // Tapping a photo opens the slideshow at that photo.
                    <button key={`${img.url}-${i}`} type="button" data-photo={i} aria-label={`Open photo ${i + 1} of ${photos.length}`} className="block w-full">
                      <ListingPhoto image={img} name={i === 0 ? listing.name : ""} sizes="(min-width: 1152px) 1104px, 100vw" preload={i === 0} className="aspect-[4/3] sm:aspect-video" />
                    </button>
                  ))}
                </Carousel>
              </div>
              {photos.length >= 5 && (
                <div className="hidden h-[clamp(20rem,52vh,30rem)] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl md:grid">
                  {photos.slice(0, 5).map((img, i) => (
                    <button
                      key={`${img.url}-${i}`}
                      type="button"
                      data-photo={i}
                      aria-label={`Open photo ${i + 1} of ${photos.length}`}
                      className={`group relative overflow-hidden ${i === 0 ? "col-span-2 row-span-2" : ""}`}
                    >
                      <ListingPhoto
                        image={img}
                        name={i === 0 ? listing.name : ""}
                        sizes={i === 0 ? "(min-width: 1152px) 1104px, 100vw" : "25vw"}
                        preload={i === 0}
                        className="h-full w-full"
                        imgClassName="transition duration-300 group-hover:brightness-90"
                      />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <ListingPhoto image={null} name={listing.name} sizes="100vw" className="aspect-video sm:rounded-2xl" />
          )}
        </PhotoTour>
      </div>

      <div className="grid gap-x-12 md:grid-cols-[minmax(0,1fr)_320px] lg:grid-cols-[minmax(0,1fr)_372px] lg:gap-x-24">
        <div className="min-w-0">
          <header className="py-6 lg:py-8">
            <h1 className="mb-3 text-[1.625rem] leading-tight sm:hidden">{listing.name}</h1>
            <h2 className="text-h2 max-sm:text-base max-sm:font-normal">
              Entire {kind.toLowerCase()} in {listing.city}
            </h2>
            <p className="mt-1">{specs.join(" · ")}</p>
            {listing.rating && listing.rating.count > 0 && <ReviewsDialog trigger="link" slug={listing.slug} rating={listing.rating} brandName={site.brandName} />}
          </header>

          <div className="flex items-center gap-5 border-t border-line py-6">
            <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand text-lg text-white">
              {host}
            </span>
            <div>
              <p className="font-medium">Hosted by {site.brandName}</p>
              <p className="text-sm text-ink-soft">{listing.propertyName}</p>
            </div>
          </div>

          {listing.highlights.length > 0 && (
            <ul className="space-y-6 border-t border-line py-8">
              {listing.highlights.map((h) => (
                <li key={h.title} className="flex gap-5">
                  <Icon name={h.icon} className="mt-0.5 h-6 w-6 shrink-0" strokeWidth={1.4} />
                  <div>
                    <p className="font-medium">{h.title}</p>
                    <p className="text-sm text-ink-soft">{h.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <section className={section}>
            <h2 className="sr-only">About this space</h2>
            <p className={`whitespace-pre-line ${listing.description.length > 320 ? "line-clamp-6" : ""}`}>{listing.description}</p>
            {listing.description.length > 320 && (
              <div className="mt-4">
                <MoreDialog label="Show more" title="About this space" variant="link">
                  <p className="whitespace-pre-line">{listing.description}</p>
                </MoreDialog>
              </div>
            )}
          </section>

          {bedrooms.length > 0 && (
            <section className={section} aria-labelledby="sleep-heading">
              <h2 id="sleep-heading" className="text-h2">
                Where you’ll sleep
              </h2>
              <p className="mt-1 text-ink-soft">{specs.filter((s) => /bed/.test(s)).join(" · ")}</p>
              <ul className="mt-6 grid grid-cols-2 gap-4">
                {bedrooms.map((img) => (
                  <li key={img.url}>
                    <ListingPhoto image={{ ...img, alt: "" }} name="" sizes="(min-width: 768px) 320px, 50vw" className="aspect-[3/2] rounded-xl" />
                    <p className="mt-3 text-sm">{img.alt}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {listing.amenities.length > 0 && (
            <section id="amenities" className={section}>
              <h2 className="text-h2">What this place offers</h2>
              <ul className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">{listing.amenities.slice(0, 10).map(amenity)}</ul>
              {listing.amenities.length > 10 && (
                <div className="mt-8">
                  <MoreDialog label={`Show all ${listing.amenities.length} amenities`} title="What this place offers">
                    <div className="gap-x-10 sm:columns-2 [&>div]:mb-8 [&>div]:break-inside-avoid">
                      {amenityGroups.map((g) => (
                        <div key={g.title}>
                          <h3 className="text-h3">{g.title}</h3>
                          <ul className="mt-5 space-y-5">{g.items.map(amenity)}</ul>
                        </div>
                      ))}
                    </div>
                  </MoreDialog>
                </div>
              )}
            </section>
          )}

          {/* The booking panel draws its calendar here. */}
          <section className={`${section} max-md:hidden`} aria-label="Choose your dates">
            <CalendarSlot listingId={listing.id} />
          </section>
        </div>

        <aside id="book" className="self-start max-md:pb-8 md:sticky md:top-[88px] md:pt-8" aria-label="Check availability">
          <BookingWidget
            listingId={listing.id}
            city={listing.city}
            maxGuests={listing.maxGuests}
            minNights={listing.minNights}
            maxNights={listing.maxNights}
            fromPrice={listing.fromPrice}
            currency={site.currency}
            timezone={site.timezone}
            pricesAddGst={site.pricesAddGst}
            askHost={whatsapp ? { whatsapp, stayName: listing.name } : undefined}
          />
        </aside>
      </div>

      {reviews.length > 0 && (
        <section id="reviews" className={section} aria-labelledby="reviews-heading">
          <h2 id="reviews-heading" className="flex flex-wrap items-baseline gap-x-3 text-h2">
            Guest reviews <Rating rating={listing.rating} className="text-base" />
          </h2>
          <ul className="mt-8 grid gap-x-24 gap-y-10 md:grid-cols-2">
            {reviews.slice(0, 6).map((r, i) => (
              <li key={`${r.author}-${r.month}-${i}`}>
                <ReviewItem review={r} brandName={site.brandName} clamp />
              </li>
            ))}
          </ul>
          {listing.rating && (
            <div className="mt-10">
              <ReviewsDialog trigger="button" slug={listing.slug} rating={listing.rating} brandName={site.brandName} />
            </div>
          )}
        </section>
      )}

      {mapAt && (
        <section id="location" className={section}>
          <h2 className="text-h2">Where you’ll be</h2>
          <p className="mt-4">{listing.city}</p>
          <StaysMap pins={[{ id: listing.id, lat: mapAt.lat, lng: mapAt.lng, label: listing.name }]} approximate zoom={13} className="mt-6 h-72 rounded-2xl sm:h-[480px]" />
          <p className="mt-4 text-sm text-ink-soft">The circle shows the area; the exact address is shared after booking.</p>
        </section>
      )}

      {/* Who is behind the stay, in the host's own words, with a direct line. No invented stats. */}
      {(messageHref || callHref) && (
        <section className={section} aria-labelledby="host-heading">
          <h2 id="host-heading" className="text-h2">
            Meet your host
          </h2>
          <div className="mt-6 grid gap-8 rounded-3xl bg-sand-deep p-6 sm:p-10 md:grid-cols-[20rem_1fr] md:gap-16">
            <div className="grid place-items-center rounded-3xl bg-white p-8 text-center shadow-[0_6px_20px_rgba(0,0,0,0.1)]">
              <div>
                <span aria-hidden className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-brand text-4xl text-white">
                  {host}
                </span>
                <p className="mt-4 text-[1.625rem] font-medium leading-tight">{site.brandName}</p>
                <p className="mt-1 text-sm text-ink-soft">{plural(all.length, "home")} in all</p>
              </div>
            </div>
            <div>
              <p>{site.statement}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                {messageHref && (
                  <a href={messageHref} target="_blank" rel="noopener noreferrer" className={buttonClass("dark")}>
                    <Icon name="chat" className="h-4 w-4" /> Message host
                  </a>
                )}
                {callHref && (
                  <a href={callHref} className={buttonClass("outline")}>
                    Call {site.contact.phone}
                  </a>
                )}
              </div>
              <p className="mt-8 flex gap-3 border-t border-line pt-6 text-sm text-ink-soft">
                <Icon name="wallet" className="h-5 w-5 shrink-0" /> You book directly with us: no platform fees on top of the price.
              </p>
            </div>
          </div>
        </section>
      )}

      <section id="things" className={section}>
        <h2 className="text-h2">Things to know</h2>
        <div className="mt-6 grid gap-8 md:grid-cols-3">
          <div>
            <Icon name="calendar" className="h-6 w-6" strokeWidth={1.4} />
            <h3 className="mt-3 font-medium">Cancellation policy</h3>
            <p className="mt-2 text-sm text-ink-soft">{site.policies.cancellation}</p>
          </div>
          <div>
            <Icon name="key" className="h-6 w-6" strokeWidth={1.4} />
            <h3 className="mt-3 font-medium">House rules</h3>
            <ul className="mt-2 space-y-1 text-sm text-ink-soft">
              <li>Check-in from {site.policies.checkInTime}</li>
              <li>Check-out by {site.policies.checkOutTime}</li>
              <li>{plural(listing.maxGuests, "guest")} maximum</li>
              {listing.minNights > 1 && <li>Minimum stay {listing.minNights} nights</li>}
            </ul>
            {rules.length > 0 && (
              <MoreDialog label="Learn more" title="House rules" variant="link">
                <ul className="divide-y divide-line">
                  {rules.map((r) => (
                    <li key={r} className="py-4">
                      {r}
                    </li>
                  ))}
                </ul>
              </MoreDialog>
            )}
          </div>
          <div>
            <Icon name="shield" className="h-6 w-6" strokeWidth={1.4} />
            <h3 className="mt-3 font-medium">Booking with us</h3>
            <p className="mt-2 text-sm text-ink-soft">
              You won’t be charged until you confirm. Please bring a photo ID for each adult guest.
            </p>
          </div>
        </div>
      </section>

      {others.length > 0 && (
        <section className={section}>
          <h2 className="text-h2">More stays with {site.brandName}</h2>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
            {others.slice(0, 4).map((l) => (
              <ListingCard key={l.id} listing={l} currency={site.currency} addsGst={site.pricesAddGst} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

// Reads the URL inside <Suspense> so the shell renders at once and client navigations stay instant.
export default function ListingPage({ params }: PageProps<"/[site]/stays/[listing]">) {
  return (
    <Suspense fallback={<div className="mx-auto mt-6 h-[70svh] max-w-7xl animate-pulse rounded-3xl bg-sand-deep" aria-hidden />}>
      <ListingPageContent params={params} />
    </Suspense>
  );
}
