import Link from "next/link";
import { cacheLife } from "next/cache";
import { Mail, Phone } from "lucide-react";
import { Logo } from "@/components/site/logo";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { site } from "@/lib/site";
import { telLink, whatsappLink } from "@/lib/format";
import { formatGhanaPhone } from "@/lib/phone";

const links = [
  { href: "/fleet", label: "Fleet" },
  { href: "/services", label: "Services" },
  { href: "/book", label: "Book" },
  { href: "/about", label: "About & Contact" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
];

// Simple, compact footer. Right padding on phones keeps it clear of the floating buttons.
export async function SiteFooter() {
  "use cache";
  cacheLife("days"); // keeps the © year current without reading the clock on every request
  return (
    <footer data-floating-avoid className="bg-brand-ink text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 pr-20 sm:px-6 sm:pr-24 lg:pr-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Logo inverted />
            <p className="hidden font-display text-white/60 italic sm:block">{site.tagline}</p>
          </div>

          <nav aria-label="Footer" className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-white/75">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-white">
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <IconLink href={whatsappLink()} label="WhatsApp" external>
              <WhatsAppIcon className="size-4" />
            </IconLink>
            <IconLink href={telLink()} label={`Call ${formatGhanaPhone(site.phone)}`}>
              <Phone className="size-4" />
            </IconLink>
            <IconLink href={`mailto:${site.email}`} label={`Email ${site.email}`}>
              <Mail className="size-4" />
            </IconLink>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-1 border-t border-white/10 pt-4 text-xs text-white/45 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} {site.name} · {site.address}</p>
          <p>Secure payments by Paystack · MoMo & card</p>
        </div>
      </div>
    </footer>
  );
}

function IconLink({ href, label, external, children }: { href: string; label: string; external?: boolean; children: React.ReactNode }) {
  return (
    <a
      href={href}
      aria-label={label}
      title={label}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="grid size-9 place-items-center rounded-full bg-white/10 text-white/85 transition-colors hover:bg-brand-orange hover:text-brand-ink"
    >
      {children}
    </a>
  );
}
