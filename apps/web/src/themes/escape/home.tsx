import Link from "next/link";
import { Carousel } from "@/components/carousel";
import { HeroSearch } from "@/components/hero-search";
import { Icon } from "@/components/icons";
import type { ListingImage, ListingSummary, Site } from "@/lib/pms";
import { ListingCard } from "./listing-card";
import { ListingPhoto } from "./listing-media";

// Escape home page sections. Each takes only the content it renders, so v0.5 can make the order
// and visibility owner-configurable without touching the sections themselves.

const container = "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8";
const pill = "inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 text-white transition hover:brightness-125";

export function Hero({ site, stays }: { site: Site; stays: ListingSummary[] }) {
  return (
    // Full-bleed photo with the promise and the search on top: the place sells itself first.
    <section className="relative isolate overflow-hidden bg-brand">
      <div className="absolute inset-0 -z-10">
        <ListingPhoto image={site.heroImage} name="" sizes="100vw" priority className="h-full w-full" />
        {/* Two scrims keep white text at >= 4.5:1 over any photo: bottom (all screens) and left (wide screens). */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/10" />
        <div aria-hidden className="absolute inset-0 hidden bg-gradient-to-r from-black/50 via-black/15 to-transparent lg:block" />
      </div>
      <div className="mx-auto flex min-h-[calc(100svh-76px)] max-w-7xl flex-col justify-end px-4 pb-8 pt-24 sm:px-6 sm:pb-12 lg:px-8 lg:pb-16 lg:pt-32">
        {site.location && <p className="text-eyebrow uppercase text-white/85">{site.location.label}</p>}
        <h1 className="mt-3 max-w-3xl text-display text-white">{site.tagline}</h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-white/90 sm:mt-5 sm:text-lead">{site.intro}</p>
        <div className="mt-7 sm:mt-9">
          <HeroSearch cities={[...new Set(stays.map((s) => s.city))].sort()} />
        </div>
        <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/90">
          {["Best rate, booked direct", "Instant confirmation", "Free cancellation up to 7 days"].map((t) => (
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
    <section className={`${container} py-20 text-center sm:py-28`}>
      <p className="mx-auto max-w-3xl text-h2 tracking-tight">{site.statement}</p>
    </section>
  );
}

export function Stays({ listings, currency, addsGst }: { listings: ListingSummary[]; currency: string; addsGst?: boolean }) {
  // A grid, not a carousel: guests see the range at a glance instead of paging to find it.
  const shown = listings.slice(0, 6);
  return (
    <section id="stays" className={`${container} scroll-mt-24`}>
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
        <div className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((l, i) => (
            <ListingCard key={l.id} listing={l} currency={currency} priority={i < 3} addsGst={addsGst} />
          ))}
        </div>
      )}
      {listings.length > shown.length && (
        <div className="mt-12 text-center">
          <Link href="/stays" className={pill}>
            See all {listings.length} stays <Icon name="arrowRight" className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
  );
}

export function Highlights({ items }: { items: Site["highlights"] }) {
  if (!items.length) return null;
  // Open editorial row (no boxed tiles): reasons to book direct, read in one pass.
  return (
    <section className={`${container} py-20 sm:py-24`}>
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
    <section id="about" className={`${container} scroll-mt-24 py-8`}>
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-24">
        <ListingPhoto image={about.image} name="" sizes="(min-width: 1024px) 50vw, 100vw" className="aspect-[4/3] rounded-3xl lg:aspect-[4/5]" />
        <div>
          <p className="text-eyebrow uppercase text-ink-soft">Our story</p>
          <h2 className="mt-4 text-h1">{about.title}</h2>
          <p className="mt-6 whitespace-pre-line text-lg leading-relaxed text-ink-soft">{about.body}</p>
        </div>
      </div>
    </section>
  );
}

export function Gallery({ images }: { images: ListingImage[] }) {
  if (images.length < 3) return null;
  return (
    <section className={`${container} py-24`}>
      <Carousel label="Photo gallery" slideClassName="w-[80%] sm:w-[48%] lg:w-[38%]" gapClassName="gap-4">
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
    <section className="bg-brand py-24 text-white sm:py-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <Carousel label="Guest reviews" slideClassName="w-full" gapClassName="gap-0" arrowTone="dark">
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

export function Faq({ items }: { items: Site["faqs"] }) {
  if (!items.length) return null;
  return (
    <section id="faq" className={`${container} scroll-mt-24 py-24 sm:py-32`}>
      <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr]">
        <div>
          <h2 className="text-h1">Questions, answered</h2>
          <p className="mt-5 text-ink-soft">Can’t find what you need? Message us and we’ll reply quickly.</p>
        </div>
        <div className="divide-y divide-line border-y border-line">
          {items.map((f) => (
            <details key={f.q} className="group py-6 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg">
                {f.q}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-line transition group-open:rotate-45">
                  <span className="text-xl leading-none">+</span>
                </span>
              </summary>
              <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
