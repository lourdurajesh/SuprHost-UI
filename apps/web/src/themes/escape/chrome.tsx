import Link from "next/link";
import { AccountMenu } from "@/components/account-menu";
import { Icon } from "@/components/icons";
import type { Site } from "@/lib/pms";

function Wordmark({ site }: { site: Site }) {
  return (
    <Link href="/" className="leading-none">
      <span className="block text-2xl tracking-tight text-ink">{site.brandName}</span>
      {site.location && <span className="mt-1 block text-[10px] uppercase tracking-[0.2em] text-ink-soft">{site.location.label}</span>}
    </Link>
  );
}

export function SiteHeader({ site }: { site: Site }) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Wordmark site={site} />
        <nav aria-label="Main" className="flex items-center gap-1 text-[15px] text-ink sm:gap-3">
          <Link href="/#about" className="hidden rounded-full px-3 py-2 hover:text-ink-soft md:inline">
            Our story
          </Link>
          <Link href="/stays" className="hidden rounded-full px-3 py-2 hover:text-ink-soft sm:inline">
            Stays
          </Link>
          <Link href="/#faq" className="hidden rounded-full px-3 py-2 hover:text-ink-soft md:inline">
            FAQ
          </Link>
          <Link href="/#contact" className="hidden rounded-full px-3 py-2 hover:text-ink-soft lg:inline">
            Contact
          </Link>
          <AccountMenu />
          <Link href="/stays" className="ml-1 rounded-full bg-brand px-5 py-2.5 text-white transition hover:brightness-125">
            Book now
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ site }: { site: Site }) {
  const { contact } = site;
  const whatsapp = contact.whatsapp?.replace(/\D/g, "");
  const label = "text-[11px] uppercase tracking-[0.16em] text-ink-soft";
  const link = "text-ink hover:text-ink-soft";
  return (
    <footer id="contact" className="mt-28 border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.3fr_1fr] lg:px-8">
        <div className="lg:border-r lg:border-line lg:pr-16">
          <h2 className="text-3xl tracking-tight sm:text-4xl">Talk to us before you book</h2>
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
        <div className="grid grid-cols-2 gap-8 text-[15px]">
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
