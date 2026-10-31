import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Carousel } from "@/components/carousel";
import { BookingWidget } from "@/components/booking-widget";
import { amenityIcon, Icon } from "@/components/icons";
import { PhotoTour } from "@/components/photo-tour";
import { StaysMap } from "@/components/stays-map";
import { formatMoney } from "@/lib/dates";
import { getListing, getListings, getSite } from "@/lib/pms";
import { ListingCard } from "@/themes/escape/listing-card";
import { ListingPhoto } from "@/themes/escape/listing-media";

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

export default async function ListingPage({ params }: PageProps<"/[site]/stays/[listing]">) {
  const { site: key, listing: slug } = await params;
  const [site, listing, all] = await Promise.all([getSite(key), getListing(key, slug), getListings(key)]);
  if (!site || !listing) notFound();

  const photos = listing.images.length ? listing.images : listing.image ? [listing.image] : [];
  const others = all.filter((l) => l.id !== listing.id).slice(0, 3);
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
  };

  return (
    <>
      <article className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

        <nav aria-label="Sections" className="no-scrollbar sticky top-[76px] z-30 -mx-4 flex gap-6 overflow-x-auto border-b border-line bg-white/95 px-4 py-3 text-[15px] backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          {[["photos", "Photos"], ["amenities", "Amenities"], ["things", "Things to know"], ["location", "Location"], ["book", "Book"]].map(([id, label]) => (
            <a key={id} href={`#${id}`} className="shrink-0 text-ink-soft hover:text-ink">
              {label}
            </a>
          ))}
        </nav>

        {/* One large photo carousel with a counter; the photo tour shows them all. */}
        <div id="photos" className="relative mt-5 scroll-mt-32">
          {photos.length > 0 ? (
            <Carousel label={`Photos of ${listing.name}`} slideClassName="w-full" gapClassName="gap-0" counter className="overflow-hidden rounded-3xl">
              {photos.map((img, i) => (
                <ListingPhoto
                  key={`${img.url}-${i}`}
                  image={img}
                  name={i === 0 ? listing.name : ""}
                  sizes="(min-width: 1280px) 1216px, 100vw"
                  priority={i === 0}
                  className="aspect-[4/3] sm:aspect-[16/8]"
                />
              ))}
            </Carousel>
          ) : (
            <ListingPhoto image={null} name={listing.name} sizes="100vw" className="aspect-[16/8] rounded-3xl" />
          )}
          <div className="absolute left-4 top-4">
            <PhotoTour images={photos} name={listing.name} />
          </div>
        </div>

        <div className="mt-10 grid gap-14 lg:grid-cols-[1fr_400px]">
          <div>
            <header>
              <p className="text-sm uppercase tracking-[0.14em] text-ink-soft">
                {listing.city} · {listing.propertyName}
              </p>
              <h1 className="mt-2 text-4xl leading-tight tracking-tight sm:text-5xl">{listing.name}</h1>
              <ul className="mt-3 flex flex-wrap items-center text-ink-soft">
                {specs.map((s, i) => (
                  <li key={s.label} className="flex items-center">
                    {i > 0 && <span aria-hidden className="mx-3 h-4 w-px bg-line" />}
                    {s.label}
                  </li>
                ))}
              </ul>
            </header>

            {listing.highlights.length > 0 && (
              <ul className="mt-8 grid gap-px overflow-hidden rounded-3xl bg-line sm:grid-cols-3">
                {listing.highlights.map((h) => (
                  <li key={h.title} className="bg-sand-deep p-6">
                    <Icon name={h.icon} className="h-6 w-6" strokeWidth={1.3} />
                    <p className="mt-4">{h.title}</p>
                    <p className="mt-1 text-sm text-ink-soft">{h.text}</p>
                  </li>
                ))}
              </ul>
            )}

            <section className="mt-10">
              <h2 className="font-display text-3xl">About this stay</h2>
              <p className="mt-5 whitespace-pre-line text-lg leading-relaxed text-ink-soft">{listing.description}</p>
            </section>

            {listing.amenities.length > 0 && (
              <section id="amenities" className="mt-12 scroll-mt-36 border-t border-line pt-10">
                <h2 className="font-display text-3xl">What this place offers</h2>
                <ul className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  {listing.amenities.map((a) => (
                    <li key={a} className="flex items-center gap-4">
                      <Icon name={amenityIcon(a)} className="h-6 w-6 text-ink-soft" /> {a}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section id="things" className="mt-12 scroll-mt-36 border-t border-line pt-10">
              <h2 className="font-display text-3xl">Things to know</h2>
              <div className="mt-6 grid gap-8 sm:grid-cols-3">
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

            {(listing.location ?? site.location) && (
              <section id="location" className="mt-12 scroll-mt-36 border-t border-line pt-10">
                <h2 className="font-display text-3xl">Where you’ll be</h2>
                <p className="mt-2 text-ink-soft">
                  {listing.city}
                  {site.location ? ` · ${site.location.label}` : ""}. The exact address is shared after booking.
                </p>
                <StaysMap
                  pins={[{ id: listing.id, lat: (listing.location ?? site.location)!.lat, lng: (listing.location ?? site.location)!.lng, label: listing.name }]}
                  approximate
                  zoom={13}
                  className="mt-6 h-[360px] rounded-3xl"
                />
              </section>
            )}
          </div>

          <aside id="book" className="scroll-mt-36 lg:sticky lg:top-[140px] lg:self-start" aria-label="Check availability">
            <BookingWidget
              listingId={listing.id}
              maxGuests={listing.maxGuests}
              minNights={listing.minNights}
              maxNights={listing.maxNights}
              fromPrice={listing.fromPrice}
              currency={site.currency}
              timezone={site.timezone}
            />
          </aside>
        </div>

        {others.length > 0 && (
          <section className="mt-24 border-t border-line pt-14">
            <h2 className="font-display text-3xl">You might also like</h2>
            <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((l) => (
                <ListingCard key={l.id} listing={l} currency={site.currency} />
              ))}
            </div>
          </section>
        )}
      </article>

      {/* Mobile booking bar: plain link, no JS. */}
      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-white via-white/95 to-white/0 px-4 pb-4 pt-6 lg:hidden">
        <a href="#book" className="mx-auto flex max-w-xl items-center justify-center gap-2 rounded-full bg-brand px-6 py-4 text-white shadow-lg">
          Select dates <span className="text-white/60">·</span> {formatMoney(listing.fromPrice, site.currency)} / night
        </a>
      </div>
    </>
  );
}
