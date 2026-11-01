import { notFound } from "next/navigation";
import { getListings, getSite, type ListingImage } from "@/lib/pms";
import { About, Faq, Gallery, Hero, Highlights, Intro, Stays, Testimonials } from "@/themes/escape/home";
import { Suspense } from "react";

async function HomePageContent({ params }: Pick<PageProps<"/[site]">, "params">) {
  const { site: key } = await params;
  const [site, listings] = await Promise.all([getSite(key), getListings(key)]);
  if (!site) notFound();

  const gallery = [site.heroImage, site.about?.image, ...listings.map((l) => l.image)]
    .filter((i): i is ListingImage => Boolean(i))
    .filter((img, i, all) => all.findIndex((x) => x.url === img.url) === i);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: site.brandName,
    description: site.seo.description,
    url: site.canonicalUrl,
    ...(site.heroImage ? { image: new URL(site.heroImage.url, site.canonicalUrl).toString() } : {}),
    ...(site.contact.phone ? { telephone: site.contact.phone } : {}),
    ...(site.contact.email ? { email: site.contact.email } : {}),
    ...(site.contact.address ? { address: site.contact.address } : {}),
    ...(site.location ? { geo: { "@type": "GeoCoordinates", latitude: site.location.lat, longitude: site.location.lng } } : {}),
    checkinTime: site.policies.checkInTime,
    checkoutTime: site.policies.checkOutTime,
    priceRange: listings.length ? `From ₹${Math.min(...listings.map((l) => l.fromPrice))}` : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify output with "<" escaped cannot break out of the script element.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Hero site={site} stays={listings} />
      <Intro site={site} />
      <Stays listings={listings} currency={site.currency} addsGst={site.pricesAddGst} />
      <Highlights items={site.highlights} />
      <About about={site.about} />
      <Gallery images={gallery} />
      <Testimonials items={site.testimonials} />
      <Faq items={site.faqs} />
    </>
  );
}

// Reads the URL inside <Suspense> so the shell renders at once and client navigations stay instant.
export default function HomePage({ params }: PageProps<"/[site]">) {
  return (
    <Suspense fallback={<div className="mx-auto mt-6 h-[80svh] max-w-7xl animate-pulse rounded-3xl bg-sand-deep" aria-hidden />}>
      <HomePageContent params={params} />
    </Suspense>
  );
}
