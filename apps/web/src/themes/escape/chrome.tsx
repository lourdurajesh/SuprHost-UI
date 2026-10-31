import Link from "next/link";
import { AccountMenu } from "@/components/account-menu";
import { MobileMenu } from "@/components/mobile-menu";
import { Icon } from "@/components/icons";
import type { Site } from "@/lib/pms";

function Wordmark({ site }: { site: Site }) {
  return (
    <Link href="/" className="min-w-0 leading-none">
      <span className="block truncate text-xl tracking-tight text-ink sm:text-2xl">{site.brandName}</span>
      {site.location && <span className="mt-1 hidden truncate text-eyebrow uppercase text-ink-soft sm:block">{site.location.label}</span>}
    </Link>
  );
}

export function SiteHeader({ site }: { site: Site }) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Wordmark site={site} />
        <nav aria-label="Main" className="flex shrink-0 items-center gap-2 text-ink md:gap-3">
          <Link href="/#about" className="hidden rounded-full px-3 py-2 hover:text-ink-soft md:inline">
            Our story
          </Link>
          <Link href="/stays" className="hidden rounded-full px-3 py-2 hover:text-ink-soft md:inline">
            Stays
          </Link>
          <Link href="/#faq" className="hidden rounded-full px-3 py-2 hover:text-ink-soft md:inline">
            FAQ
          </Link>
          <Link href="/#contact" className="hidden rounded-full px-3 py-2 hover:text-ink-soft lg:inline">
            Contact
          </Link>
          <span className="hidden md:inline-flex">
            <AccountMenu />
          </span>
          <Link href="/stays" className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full bg-brand px-5 text-white transition hover:brightness-125">
            Book now
          </Link>
          <MobileMenu brandName={site.brandName} whatsapp={site.contact.whatsapp?.replace(/D/g, "") || null} phone={site.contact.phone} />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ site }: { site: Site }) {
  const { contact } = site;
  const whatsapp = contact.whatsapp?.replace(/\D/g, "");
  const label = "text-eyebrow uppercase text-ink-soft";
  const link = "text-ink hover:text-ink-soft";
  return (
    <footer id="contact" className="mt-20 border-t border-line lg:mt-28">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.3fr_1fr] lg:px-8">
        <div className="lg:border-r lg:border-line lg:pr-16">
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
                className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-white hover:brightness-125"
              >
                <Icon name="chat" className="h-4 w-4" /> WhatsApp
              </a>
            )}
            {contact.phone && (
              <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 rounded-full px-6 py-3 ring-1 ring-line hover:bg-sand-deep">
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
          <Link href="/policies" className="hover:text-ink">
            Policies
          </Link>
        </span>
        <span>Direct booking by SuprHost</span>
      </div>
    </footer>
  );
}
