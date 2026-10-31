import { notFound } from "next/navigation";
import { getListings, getSite, type ListingImage } from "@/lib/pms";
import { About, Faq, Gallery, Hero, Highlights, Intro, Stays, Testimonials } from "@/themes/escape/home";

export default async function HomePage({ params }: PageProps<"/[site]">) {
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
      <Stays listings={listings} currency={site.currency} />
      <Highlights items={site.highlights} />
      <About about={site.about} />
      <Gallery images={gallery} />
      <Testimonials items={site.testimonials} />
      <Faq items={site.faqs} />
    </>
  );
}
