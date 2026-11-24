import Link from "next/link";
import { Carousel } from "@/components/carousel";
import { buttonClass } from "@/components/ui/button";
import { plural } from "@/lib/text";
import { HeroSearchBar } from "@/components/search/header-search";
import { Icon } from "@/components/icons";
import { formatMoney } from "@/lib/dates";
import type { ListingImage, ListingSummary, Site } from "@/lib/pms";
import { FaqList } from "./faq";
import { ListingCard } from "./listing-card";
import { ListingPhoto } from "./listing-media";

// Escape home page sections. Each takes only the content it renders, so v0.5 can make the order
// and visibility owner-configurable without touching the sections themselves.

const container = "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8";

export function Hero({ site }: { site: Site }) {
  return (
    // Full-bleed photo with the promise and the search on top: the place sells itself first.
    <section className="relative isolate overflow-hidden bg-brand">
      <div className="absolute inset-0 -z-10">
        <ListingPhoto image={site.heroImage} name="" sizes="100vw" preload className="h-full w-full" />
        {/* Two scrims keep white text at >= 4.5:1 over the photo: bottom (all screens) and left (wide screens).
            Strengths were measured against the real photo, text block by text block; phones need the heavier
            one because the text block covers more of the picture. Re-measure when the hero photo changes. */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/65 to-black/45 lg:from-black/80 lg:via-black/60 lg:to-black/35" />
        <div aria-hidden className="absolute inset-0 hidden bg-gradient-to-r from-black/55 via-black/20 to-transparent lg:block" />
      </div>
      <div className="mx-auto flex min-h-[calc(100svh-76px)] max-w-7xl flex-col justify-end px-4 pb-8 pt-24 sm:px-6 sm:pb-12 lg:px-8 lg:pb-16 lg:pt-32">
        {site.location && <p className="text-eyebrow uppercase text-white">{site.location.label}</p>}
        <h1 className="mt-3 max-w-3xl text-display text-white">{site.tagline}</h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-white/90 sm:mt-5 sm:text-lead">{site.intro}</p>
        <div className="mt-7 sm:mt-9">
          <HeroSearchBar />
        </div>
        <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/90">
          {["Best rate, booked direct", "Free cancellation up to 7 days"].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <Icon name="check" className="h-4 w-4" strokeWidth={2} /> {t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Intro({ site }: { site: Site }) {
  return (
    <section className={`${container} py-12 text-center sm:py-16`}>
      <p className="mx-auto max-w-3xl text-h2 tracking-tight">{site.statement}</p>
    </section>
  );
}

export function Stays({ listings, currency, addsGst }: { listings: ListingSummary[]; currency: string; addsGst?: boolean }) {
  // A grid, not a carousel: guests see the range at a glance instead of paging to find it.
  const shown = listings.slice(0, 8);
  return (
    <section id="stays" className={container}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-h1">Our homes</h2>
          <p className="mt-3 text-ink-soft">Prices are per night; your exact total, with fees and GST, shows once you pick dates.</p>
        </div>
        {listings.length > shown.length && (
          <Link href="/stays" className="hidden shrink-0 text-base underline decoration-1 underline-offset-4 hover:text-ink-soft sm:inline">
            View all {listings.length} stays
          </Link>
        )}
      </div>
      {listings.length === 0 ? (
        <p className="mt-10 text-ink-soft">New stays are coming soon.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
          {shown.map((l) => (
            <ListingCard key={l.id} listing={l} currency={currency} addsGst={addsGst} />
          ))}
        </div>
      )}
      {listings.length > shown.length && (
        <div className="mt-12 text-center">
          <Link href="/stays" className={buttonClass()}>
            See all {listings.length} stays <Icon name="arrowRight" className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
  );
}

/**
 * Browse by place: one tile per town the host has stays in, built from the listings themselves
 * (count, lowest price, a photo), so it needs no extra content and never goes stale. Shown only
 * when there are at least two places; with one, "Our homes" already is the place.
 */
export function Destinations({ listings, currency }: { listings: ListingSummary[]; currency: string }) {
  const byCity = new Map<string, ListingSummary[]>();
  for (const l of listings) byCity.set(l.city, [...(byCity.get(l.city) ?? []), l]);
  if (byCity.size < 2) return null;
  const places = [...byCity.entries()]
    .map(([city, stays]) => ({
      city,
      count: stays.length,
      from: Math.min(...stays.map((s) => s.fromPrice)),
      image: stays.find((s) => s.image)?.image ?? null,
    }))
    .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city));

  return (
    <section className={`${container} mt-16`} aria-labelledby="places-heading">
      <h2 id="places-heading" className="text-h1">
        Choose your place
      </h2>
      <p className="mt-3 text-ink-soft">Pick a city to see its homes.</p>
      <ul className={`mt-10 grid gap-3 sm:grid-cols-3 sm:gap-4 ${places.length > 3 ? "grid-cols-2 lg:grid-cols-6" : ""}`}>
        {places.map((p) => (
          <li key={p.city}>
            <Link href={`/stays?city=${encodeURIComponent(p.city)}`} className="group relative block overflow-hidden rounded-2xl">
              <ListingPhoto
                image={p.image}
                name=""
                sizes={places.length > 3 ? "(min-width: 1024px) 16vw, (min-width: 640px) 33vw, 50vw" : "(min-width: 640px) 33vw, 100vw"}
                className={places.length > 3 ? "aspect-[4/5]" : "aspect-[4/3]"}
                imgClassName="transition-transform duration-700 group-hover:scale-[1.04]"
              />
              {/* Scrim keeps the white text readable on any photo. */}
              <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              <span className="absolute inset-x-0 bottom-0 p-3 text-white sm:p-4">
                <span className="block text-lg leading-tight sm:text-xl">{p.city}</span>
                <span className="mt-1 block text-sm text-white/90">
                  {plural(p.count, "stay")} · from {formatMoney(p.from, currency)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Highlights({ items }: { items: Site["highlights"] }) {
  if (!items.length) return null;
  // Open editorial row (no boxed tiles): reasons to book direct, read in one pass.
  return (
    <section className={`${container} py-12 sm:py-14`}>
      <ul className="grid gap-x-10 gap-y-10 border-t border-line pt-12 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((h) => (
          <li key={h.title}>
            <Icon name={h.icon} className="h-6 w-6 text-accent" strokeWidth={1.5} />
            <h3 className="mt-4 text-h3">{h.title}</h3>
            <p className="mt-2 leading-relaxed text-ink-soft">{h.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function About({ about }: { about: Site["about"] }) {
  if (!about) return null;
  return (
    <section id="about" className={`${container} py-8`}>
      <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
        <ListingPhoto image={about.image} name="" sizes="(min-width: 1024px) 50vw, 100vw" className="aspect-[4/3] rounded-2xl" />
        <div>
          <p className="text-eyebrow uppercase text-ink-soft">Our story</p>
          <h2 className="mt-4 text-h1">{about.title}</h2>
          <p className="mt-6 whitespace-pre-line leading-relaxed text-ink-soft">{about.body}</p>
        </div>
      </div>
    </section>
  );
}

export function Gallery({ images }: { images: ListingImage[] }) {
  if (images.length < 3) return null;
  return (
    <section className={`${container} py-12`}>
      <Carousel label="Photo gallery" itemName="image" slideClassName="w-[80%] sm:w-[48%] lg:w-[38%]" gapClassName="gap-4">
        {images.map((img, i) => (
          <ListingPhoto key={`${img.url}-${i}`} image={img} name="" sizes="(min-width: 1024px) 38vw, 80vw" className="aspect-[4/5] rounded-2xl" />
        ))}
      </Carousel>
    </section>
  );
}

export function Testimonials({ items }: { items: Site["testimonials"] }) {
  if (!items.length) return null;
  return (
    <section className="bg-brand py-16 text-white sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <Carousel label="Guest reviews" itemName="review" slideClassName="w-full" gapClassName="gap-0" arrowTone="dark">
          {items.map((t) => (
            <figure key={t.author} className="px-12 text-center sm:px-20">
              <blockquote className="text-h2">“{t.quote}”</blockquote>
              <figcaption className="mt-10 text-sm">
                <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-base">
                  {t.author.charAt(0)}
                </span>
                <span className="block">{t.author}</span>
                <span className="block text-white/60">
                  {t.from} · {t.stay}
                </span>
              </figcaption>
            </figure>
          ))}
        </Carousel>
      </div>
    </section>
  );
}

/** The home page shows the first few; all of them are on /faq. */
const FAQ_PREVIEW = 3;

export function FaqPreview({ items }: { items: Site["faqs"] }) {
  if (!items.length) return null;
  return (
    <section id="faq" className={`${container} py-12 sm:py-16`}>
      <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr]">
        <div>
          <h2 className="text-h1">Questions, answered</h2>
          <p className="mt-5 text-ink-soft">Can’t find what you need? Message us and we’ll reply quickly.</p>
          <Link href="/faq" className={`${buttonClass("outline")} mt-6`}>
            View all FAQs
          </Link>
        </div>
        <FaqList items={items.slice(0, FAQ_PREVIEW)} />
      </div>
    </section>
  );
}
