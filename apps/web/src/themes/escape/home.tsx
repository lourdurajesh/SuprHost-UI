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
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl lg:min-h-[calc(100svh-76px)] lg:grid-cols-[1.25fr_1fr]">
        <div className="relative z-10 flex min-w-0 flex-col justify-center px-4 pb-12 pt-10 sm:px-6 lg:py-20 lg:pl-8 lg:pr-14">
          <h1 className="max-w-xl text-display">{site.tagline}</h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">{site.intro}</p>
          <div className="mt-10">
            <HeroSearch cities={[...new Set(stays.map((s) => s.city))].sort()} />
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-soft">
            {["Best rate, booked direct", "Instant confirmation", "Free cancellation up to 7 days"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Icon name="check" className="h-4 w-4 text-accent" strokeWidth={2} /> {t}
              </li>
            ))}
          </ul>
        </div>
        {/* Photo bleeds to the right edge on desktop; full-width under the text on mobile. */}
        <div className="relative h-[52svh] lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:w-[42vw]">
          <ListingPhoto image={site.heroImage} name="" sizes="(min-width: 1024px) 42vw, 100vw" priority className="h-full w-full" />
          <div aria-hidden className="absolute inset-y-0 left-0 hidden w-24 bg-gradient-to-r from-white to-transparent lg:block" />
        </div>
      </div>
    </section>
  );
}

export function Intro({ site }: { site: Site }) {
  return (
    <section className={`${container} py-24 text-center sm:py-32`}>
      <p className="mx-auto max-w-3xl text-h2 tracking-tight">{site.statement}</p>
      <Link href="/#about" className={`${pill} mt-10`}>
        Our story
      </Link>
    </section>
  );
}

export function Stays({ listings, currency, addsGst }: { listings: ListingSummary[]; currency: string; addsGst?: boolean }) {
  return (
    <section id="stays" className={`${container} scroll-mt-24`}>
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-h1">Our homes</h2>
        <Link href="/stays" className="mr-0 shrink-0 text-base underline decoration-1 underline-offset-4 hover:text-ink-soft sm:mr-28">
          View all {listings.length} stays
        </Link>
      </div>
      {listings.length === 0 ? (
        <p className="mt-10 text-ink-soft">New stays are coming soon.</p>
      ) : (
        <Carousel
          label="Our homes"
          arrows="header"
          className="mt-10"
          slideClassName="w-[85%] sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)]"
        >
          {listings.map((l, i) => (
            <ListingCard key={l.id} listing={l} currency={currency} priority={i < 3} addsGst={addsGst} />
          ))}
        </Carousel>
      )}
    </section>
  );
}

export function Highlights({ items }: { items: Site["highlights"] }) {
  if (!items.length) return null;
  return (
    <section className={`${container} py-24`}>
      <div className="grid gap-px overflow-hidden rounded-3xl bg-line sm:grid-cols-2 lg:grid-cols-4">
        {items.map((h) => (
          <div key={h.title} className="bg-white p-8">
            <Icon name={h.icon} className="h-7 w-7 text-ink" strokeWidth={1.3} />
            <h3 className="mt-6 text-xl tracking-tight">{h.title}</h3>
            <p className="mt-2 leading-relaxed text-ink-soft">{h.text}</p>
          </div>
        ))}
      </div>
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
