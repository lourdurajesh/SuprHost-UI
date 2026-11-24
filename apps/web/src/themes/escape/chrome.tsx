import Link from "next/link";
import { Suspense } from "react";
import { AccountMenu } from "@/components/account-menu";
import { MobileMenu } from "@/components/mobile-menu";
import { Icon } from "@/components/icons";
import { HeaderSearch, HeaderSearchFallback, SearchHost } from "@/components/search/header-search";
import { SignInHost } from "@/components/sign-in";
import type { Place } from "@/components/search/where-panel";
import type { Site } from "@/lib/pms";

function Wordmark({ site }: { site: Site }) {
  return (
    <Link href="/" className="min-w-0 leading-none">
      <span className="block truncate text-xl tracking-tight text-ink sm:text-2xl">{site.brandName}</span>
      {site.location && <span className="mt-1 hidden truncate text-eyebrow uppercase text-ink-soft lg:block">{site.location.label}</span>}
    </Link>
  );
}

// Brand, search and one menu: everything else (story, FAQ, contact, sign in) lives in the menu.
export function SiteHeader({ site, places }: { site: Site; places: Place[] }) {
  return (
    <>
    <header className="site-header sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur-md print:hidden">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-4 px-4 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:px-6 lg:px-8">
        <div className="flex h-[76px] min-w-0 flex-1 items-center">
          <Wordmark site={site} />
        </div>
        {/* Phones: a second row, on the results page only. Wider: the middle of the bar. */}
        <div className="header-search hide-in-booking-flow order-last w-full min-w-0 pb-3 sm:order-none sm:w-auto sm:pb-0">
          <Suspense fallback={<HeaderSearchFallback />}>
            <HeaderSearch />
          </Suspense>
        </div>
        <nav aria-label="Main" className="col-start-3 flex shrink-0 items-center justify-end gap-2 text-ink md:gap-3">
          <Link href="/stays" className="header-book hide-in-booking-flow inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full bg-brand px-5 text-white transition hover:brightness-125">
            Book now
          </Link>
          <span className="hidden md:inline-flex">
            <AccountMenu />
          </span>
          <MobileMenu brandName={site.brandName} whatsapp={site.contact.whatsapp?.replace(/\D/g, "") || null} phone={site.contact.phone} />
        </nav>
      </div>
    </header>
    {/* Outside the header: there the bar may be hidden, and the panel must still show. */}
    <Suspense fallback={null}>
      <SearchHost places={places} timezone={site.timezone} brandName={site.brandName} />
      <SignInHost brandName={site.brandName} phoneSignIn={site.features.includes("guest.phone_sign_in")} />
    </Suspense>
    </>
  );
}

export function SiteFooter({ site }: { site: Site }) {
  const { contact } = site;
  const whatsapp = contact.whatsapp?.replace(/\D/g, "");
  const label = "text-eyebrow uppercase text-ink-soft";
  // 44px-tall tap target on phones without changing how the column looks.
  const link = "inline-flex min-h-11 items-center text-ink hover:text-ink-soft";
  return (
    <footer id="contact" className="relative z-10 mt-12 border-t border-line bg-white lg:mt-16 print:hidden">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[1.3fr_1fr] lg:px-8">
        <div className="hide-in-booking-flow lg:border-r lg:border-line lg:pr-16">
          <h2 className="text-h1">Talk to us before you book</h2>
          <p className="mt-4 max-w-md leading-relaxed text-ink-soft">
            Questions about a stay, a special occasion or getting here? We usually reply within minutes.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-white hover:brightness-125"
              >
                <Icon name="chat" className="h-4 w-4" /> WhatsApp
              </a>
            )}
            {contact.phone && (
              <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 rounded-xl px-6 py-3 ring-1 ring-line hover:bg-sand-deep">
                <Icon name="phone" className="h-4 w-4" /> {contact.phone}
              </a>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 text-base">
          <div>
            <p className={label}>Explore</p>
            <ul className="mt-5 space-y-3">
              <li>
                <Link href="/stays" className={link}>
                  All stays
                </Link>
              </li>
              <li>
                <Link href="/#about" className={link}>
                  Our story
                </Link>
              </li>
              <li>
                <Link href="/#faq" className={link}>
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/policies" className={link}>
                  Policies
                </Link>
              </li>
              <li>
                <Link href="/account" className={link}>
                  My trips
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className={label}>Contact</p>
            <ul className="mt-5 space-y-3">
              {contact.email && (
                <li>
                  <a href={`mailto:${contact.email}`} className={link}>
                    {contact.email}
                  </a>
                </li>
              )}
              {contact.address && <li className="text-ink-soft">{contact.address}</li>}
              <li className="text-ink-soft">
                Check-in {site.policies.checkInTime} · Check-out {site.policies.checkOutTime}
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 border-t border-line px-4 py-6 text-xs text-ink-soft sm:flex-row sm:px-6 lg:px-8">
        <span>
          © {site.brandName} ·{" "}
          <Link href="/policies" className="inline-flex min-h-11 items-center hover:text-ink">
            Policies
          </Link>
        </span>
        <span>Direct booking by SuprHost</span>
      </div>
    </footer>
  );
}
