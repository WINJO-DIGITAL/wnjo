import Link from "next/link";
import { contactPhoneHref, footerNav, site } from "@/lib/site";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container container--wide">
        <div className="site-footer__grid">
          <div className="site-footer__brand">
            <Link href="/" className="brand" aria-label="WINJO DIGITAL home">
              <Logo />
            </Link>
            <p>{site.tagline}</p>
            <p className="site-footer__place">Based in Thornton-Cleveleys, Lancashire.</p>
            {/* Contact without showing the details: a call button when the number is set, and the enquiry form for email. */}
            <ul role="list" className="site-footer__contact" aria-label="Contact WINJO DIGITAL">
              {contactPhoneHref && (
                <li>
                  <a href={contactPhoneHref}>Call us</a>
                </li>
              )}
              <li>
                <Link href="/contact?topic=other">Email us</Link>
              </li>
            </ul>
          </div>
          {footerNav.map((group) => (
            <nav key={group.title} aria-label={`${group.title} links`}>
              <h2>{group.title}</h2>
              <ul role="list">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="site-footer__base">
          <p>
            © {new Date().getFullYear()} {site.name}
          </p>
          <p className="build-line">
            <Link href="/cookies">No tracking or advertising cookies</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
