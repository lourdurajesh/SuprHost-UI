import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Carousel } from "@/components/carousel";
import { BookingWidget } from "@/components/booking-widget";
import { amenityIcon, Icon } from "@/components/icons";
import { PhotoTour } from "@/components/photo-tour";
import { SectionTabs } from "@/components/section-tabs";
import { Rating } from "@/components/rating";
import { formatDate } from "@/lib/dates";
import { groupAmenities } from "@/lib/amenity-groups";
import { relatedStays } from "@/lib/related-stays";
import { StaysMap } from "@/components/stays-map";
import { TrackRecentView, WishlistButton } from "@/components/wishlist";
import { getListing, getListings, getSite } from "@/lib/pms";
import { ListingCard, PROPERTY_TYPE } from "@/themes/escape/listing-card";
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
  const others = relatedStays(listing, all);
  const rules = [...new Set([...site.policies.houseRules, ...listing.houseRules])];
  const specs = [
    { icon: "users", label: `${listing.maxGuests} guests` },
    listing.bedrooms && { icon: "home", label: `${listing.bedrooms} bedroom${listing.bedrooms === 1 ? "" : "s"}` },
    listing.beds && { icon: "bed", label: `${listing.beds} bed${listing.beds === 1 ? "" : "s"}` },
    listing.bathrooms && { icon: "bath", label: `${listing.bathrooms} bathroom${listing.bathrooms === 1 ? "" : "s"}` },
  ].filter(Boolean) as { icon: string; label: string }[];

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
  const whatsapp = site.contact.whatsapp?.replace(/\D/g, "") || null;
  const callHref = site.contact.phone ? `tel:${site.contact.phone.replace(/\s/g, "")}` : null;
  // The site's own pin stands in only for a stay in the same town; elsewhere it would mislead.
  const mapAt =
    listing.location ?? (site.location && site.location.label.toLowerCase().includes(listing.city.toLowerCase()) ? site.location : null);

  return (
    <>
      <article className="mx-auto max-w-7xl px-4 pb-28 sm:px-6 md:pb-10 lg:px-8">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

        <SectionTabs
          tabs={[
            { id: "photos", label: "Photos" },
            { id: "amenities", label: "Amenities" },
            { id: "things", label: "Things to know" },
            ...(reviews.length ? [{ id: "reviews", label: "Reviews" }] : []),
            { id: "location", label: "Location" },
            // Phones book from the bar pinned to the bottom of the screen.
            { id: "book", label: "Book", desktopOnly: true },
          ]}
        />

        {/* Desktop: photos sit in the left column so the booking card starts at the top of the page,
            fully visible on load, and stays in view while scrolling. */}
        <div className="mt-5 grid gap-10 md:grid-cols-[minmax(0,1fr)_300px] md:gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
          <div>
            {/* Phones and tablets: one swipeable photo with a counter. Desktop: a mosaic (large photo +
                four) so guests read the place at a glance; any tile or "Show all" opens the photo tour. */}
            <div id="photos" className="scroll-mt-32">
              <PhotoTour images={photos} name={listing.name}>
                {photos.length > 0 ? (
                  <>
                    <div className={photos.length >= 5 ? "lg:hidden" : ""}>
                      {/* On phones the next photo peeks in from the right, so swiping is obvious. */}
                      <Carousel label={`Photos of ${listing.name}`} slideClassName="w-[88%] sm:w-full" gapClassName="gap-2 sm:gap-0" counter className="overflow-hidden rounded-2xl">
                        {photos.map((img, i) => (
                          // Tapping a photo opens the slideshow at that photo.
                          <button key={`${img.url}-${i}`} type="button" data-photo={i} aria-label={`Open photo ${i + 1} of ${photos.length}`} className="block w-full">
                            <ListingPhoto
                              image={img}
                              name={i === 0 ? listing.name : ""}
                              sizes="(min-width: 1280px) 1216px, 100vw"
                              priority={i === 0}
                              className="aspect-[4/3] max-sm:rounded-2xl sm:aspect-video lg:aspect-auto lg:h-[min(56vh,480px)]"
                            />
                          </button>
                        ))}
                      </Carousel>
                    </div>
                    {photos.length >= 5 && (
                      <div className="hidden h-[min(56vh,480px)] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl lg:grid">
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
                              // The large tile reuses the carousel's sizes so the browser fetches one file, not two.
                              sizes={i === 0 ? "(min-width: 1280px) 1216px, 100vw" : "18vw"}
                              priority={i === 0}
                              className="h-full w-full"
                              imgClassName="transition duration-500 group-hover:scale-[1.03] group-hover:brightness-95"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <ListingPhoto image={null} name={listing.name} sizes="100vw" className="aspect-video rounded-2xl lg:aspect-auto lg:h-[min(56vh,480px)]" />
                )}
              </PhotoTour>
            </div>

            <header className="mt-8">
              <p className="text-eyebrow uppercase text-ink-soft">
                {PROPERTY_TYPE[listing.propertyType]} in {listing.city} · {listing.propertyName}
              </p>
              <div className="mt-2 flex items-start justify-between gap-4">
                <h1 className="text-h1">{listing.name}</h1>
                <WishlistButton listingId={listing.id} name={listing.name} className="shrink-0 ring-1 ring-line" />
              </div>
              <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-ink" aria-label="Key facts">
                {specs.map((s) => (
                  <li key={s.label} className="flex items-center gap-2">
                    <Icon name={s.icon} className="h-5 w-5 text-ink-soft" /> {s.label}
                  </li>
                ))}
              </ul>
              {listing.rating && listing.rating.count > 0 && (
                <a href="#reviews" className="mt-2 inline-flex min-h-11 items-center underline-offset-4 hover:underline">
                  <Rating rating={listing.rating} />
                </a>
              )}
              <TrackRecentView
                stay={{ slug: listing.slug, name: listing.name, place: listing.city, image: listing.image, fromPrice: listing.fromPrice }}
              />
            </header>

            {listing.highlights.length > 0 && (
              <ul className="mt-8 space-y-5 border-y border-line py-8">
                {listing.highlights.map((h) => (
                  <li key={h.title} className="flex gap-4">
                    <Icon name={h.icon} className="mt-0.5 h-6 w-6 shrink-0" strokeWidth={1.3} />
                    <div>
                      <p className="font-medium">{h.title}</p>
                      <p className="text-ink-soft">{h.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <section className="mt-10">
              <h2 className="text-h2">About this stay</h2>
              <p className="mt-5 whitespace-pre-line text-lead text-ink-soft">{listing.description}</p>
            </section>

            {/* Who is behind the stay, in the host's own words, with a direct line. No avatar, no invented stats. */}
            {(whatsapp || callHref) && (
              <section className="mt-12 border-t border-line pt-10" aria-labelledby="host-heading">
                <h2 id="host-heading" className="text-h2">
                  Hosted by {site.brandName}
                </h2>
                <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-start">
                  {site.about?.image && (
                    <ListingPhoto image={site.about.image} name="" sizes="160px" className="h-28 w-36 shrink-0 rounded-xl" />
                  )}
                  <div>
                    <p className="max-w-prose text-lead text-ink-soft">{site.statement}</p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      {whatsapp && (
                        <a
                          href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hello! I'm looking at ${listing.name}.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-5 text-sm font-medium hover:bg-sand"
                        >
                          <Icon name="chat" className="h-4 w-4" /> Message on WhatsApp
                        </a>
                      )}
                      {callHref && (
                        <a href={callHref} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-5 text-sm font-medium hover:bg-sand">
                          Call {site.contact.phone}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {listing.amenities.length > 0 && (
              <section id="amenities" className="mt-12 scroll-mt-36 border-t border-line pt-10">
                <h2 className="text-h2">What this place offers</h2>
                {/* A short list stays flat; a longer one gets headings so it scans. */}
                {amenityGroups.length > 1 && listing.amenities.length >= 8 ? (
                  <div className="mt-6 space-y-8">
                    {amenityGroups.map((g) => (
                      <div key={g.title}>
                        <h3 className="font-medium">{g.title}</h3>
                        <ul className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                          {g.items.map((a) => (
                            <li key={a} className="flex items-center gap-4">
                              <Icon name={amenityIcon(a)} className="h-6 w-6 text-ink-soft" /> {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <ul className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                    {listing.amenities.map((a) => (
                      <li key={a} className="flex items-center gap-4">
                        <Icon name={amenityIcon(a)} className="h-6 w-6 text-ink-soft" /> {a}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            <section id="things" className="mt-12 scroll-mt-36 border-t border-line pt-10">
              <h2 className="text-h2">Things to know</h2>
              <div className="mt-6 grid gap-8 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
                <div>
                  <h3 className="flex items-center gap-2 font-medium">
                    <Icon name="clock" className="h-5 w-5 text-accent" /> Arrival
                  </h3>
                  <ul className="mt-3 space-y-1.5 text-ink-soft">
                    <li>Check-in from {site.policies.checkInTime}</li>
                    <li>Check-out by {site.policies.checkOutTime}</li>
                    {listing.minNights > 1 && <li>Minimum stay {listing.minNights} nights</li>}
                  </ul>
                </div>
                <div>
                  <h3 className="flex items-center gap-2 font-medium">
                    <Icon name="home" className="h-5 w-5 text-accent" /> House rules
                  </h3>
                  <ul className="mt-3 space-y-1.5 text-ink-soft">
                    {rules.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="flex items-center gap-2 font-medium">
                    <Icon name="calendar" className="h-5 w-5 text-accent" /> Cancellation
                  </h3>
                  <p className="mt-3 text-ink-soft">{site.policies.cancellation}</p>
                </div>
              </div>
            </section>

            {reviews.length > 0 && (
              <section id="reviews" className="mt-12 scroll-mt-36 border-t border-line pt-10" aria-labelledby="reviews-heading">
                <h2 id="reviews-heading" className="flex flex-wrap items-baseline gap-x-3 text-h2">
                  Guest reviews <Rating rating={listing.rating} className="text-base" />
                </h2>
                <ul className="mt-6 grid gap-8 md:grid-cols-1 lg:grid-cols-2">
                  {reviews.map((r, i) => (
                    <li key={`${r.author}-${r.month}-${i}`}>
                      <p className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{r.author}</span>
                        <span className="text-ink-soft">· {formatDate(`${r.month}-01`, { month: "long", year: "numeric" })}</span>
                        {/* Every website review is tied to a completed booking, so the label is always true. */}
                        <span className="text-ink-soft">· Verified stay</span>
                        <span className="sr-only">, rated {r.rating} out of 5</span>
                        <span aria-hidden className="tracking-widest">{"★".repeat(r.rating)}<span className="text-field">{"★".repeat(5 - r.rating)}</span></span>
                      </p>
                      <p className="mt-2 whitespace-pre-line">{r.text}</p>
                      {r.reply && (
                        <p className="mt-3 border-l-2 border-line pl-4 text-sm text-ink-soft">
                          <span className="font-medium text-ink">Reply from {site.brandName}:</span> {r.reply}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {mapAt && (
              <section id="location" className="mt-12 scroll-mt-36 border-t border-line pt-10">
                <h2 className="text-h2">Where you’ll be</h2>
                <p className="mt-2 text-ink-soft">{listing.city}. The circle shows the area; the exact address is shared after booking.</p>
                <StaysMap
                  pins={[{ id: listing.id, lat: mapAt.lat, lng: mapAt.lng, label: listing.name }]}
                  approximate
                  zoom={13}
                  className="mt-6 h-72 rounded-2xl sm:h-[360px]"
                />
              </section>
            )}
          </div>

          <aside id="book" className="scroll-mt-36 md:sticky md:top-[136px] md:max-h-[calc(100dvh-152px)] md:self-start md:overflow-y-auto" aria-label="Check availability">
            <BookingWidget
              listingId={listing.id}
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

        {others.length > 0 && (
          <section className="mt-16 border-t border-line pt-12 lg:mt-24 lg:pt-14">
            <h2 className="text-h2">You might also like</h2>
            <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {others.map((l) => (
                <ListingCard key={l.id} listing={l} currency={site.currency} addsGst={site.pricesAddGst} />
              ))}
            </div>
          </section>
        )}
      </article>

    </>
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
