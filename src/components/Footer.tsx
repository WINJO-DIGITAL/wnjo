import Link from "next/link";
import { footerNav, site } from "@/lib/site";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container container--wide">
        <div className="site-footer__grid">
          <div className="site-footer__brand">
            <Link href="/" className="brand" aria-label="WNJO home">
              <Logo />
            </Link>
            <p>{site.tagline}</p>
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
          <ul role="list" className="build-line" aria-label="Privacy">
            <li>No cookies</li>
            <li>No trackers</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
