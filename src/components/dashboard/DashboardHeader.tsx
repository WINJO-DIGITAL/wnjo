"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AccountMenu } from "@/components/account/AccountMenu";
import { NotificationsBell } from "@/components/account/NotificationsBell";
import { Logo } from "@/components/Logo";
import { supabase } from "@/lib/supabase";

type DashItem = { label: string; hint: string; href: string };
/** A top-level entry: either a link of its own (href) or a menu of items. */
type DashGroup = { label: string; href?: string; items: DashItem[] };

/** Client dashboard sections: four plain links, one per place a customer goes. */
const CUSTOMER: DashGroup[] = [
  { label: "Your websites", href: "/account", items: [] },
  { label: "Plan & billing", href: "/account/billing", items: [] },
  { label: "Settings", href: "/account/settings", items: [] },
  { label: "Help", href: "/account/help", items: [] },
];

/** Staff dashboard sections. Items switch the admin view (it listens for the address hash). */
const STAFF: DashGroup[] = [
  { label: "Today", href: "/admin#overview", items: [] },
  { label: "Customers", href: "/admin#customers", items: [] },
  {
    label: "Sales",
    items: [
      { label: "Enquiries", hint: "New leads from the site", href: "/admin#enquiries" },
      { label: "Website builds", hint: "Briefs, previews and approvals", href: "/admin#builds" },
      { label: "Subscriptions", hint: "Plans, payment links and cancellations", href: "/admin#subscriptions" },
    ],
  },
  // The quoted, bespoke-project route: quotes, staged orders, project messages and sign-offs. Kept together, apart
  // from the monthly-website work that fills most days.
  {
    label: "Bespoke projects",
    items: [
      { label: "Quotes", hint: "Sent, accepted and declined", href: "/admin#quotes" },
      { label: "Orders", hint: "Stages, updates and client invites", href: "/admin#orders" },
      { label: "Projects", hint: "Messages and files", href: "/admin#projects" },
      { label: "Approvals", hint: "Client sign-offs", href: "/admin#approvals" },
    ],
  },
  {
    label: "Studio",
    items: [{ label: "AI agents", hint: "Tasks, budget and briefing", href: "/admin#ai" }],
  },
];

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" style={{ transform: `rotate(${open ? 180 : 0}deg)`, transition: "transform .2s" }}>
      <path d="M1.5 3.25 5 6.75l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The dashboard's own top bar, used instead of the site header on the client and staff dashboards.
 * Each section opens its own dropdown; on a phone they collapse into one menu.
 */
export function DashboardHeader({ variant }: { variant: "customer" | "staff" }) {
  const groups = variant === "staff" ? STAFF : CUSTOMER;
  const [openGroup, setOpenGroup] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const barRef = useRef<HTMLElement>(null);
  const [hash, setHash] = useState("");
  useEffect(() => {
    const read = () => setHash(window.location.hash);
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const pathname = usePathname();
  // Staff sections live in the address hash (a section may carry more after a slash); customer pages are real pages.
  const isHere = (href: string) =>
    href.startsWith("/admin") ? href.slice(href.indexOf("#")) === (hash || "#overview").split("/")[0] : href === pathname;

  useEffect(() => {
    if (openGroup === null && !mobileOpen) return;
    const onDown = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
        setMobileOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenGroup(null);
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openGroup, mobileOpen]);

  const close = () => {
    setOpenGroup(null);
    setMobileOpen(false);
  };

  return (
    <header className="dash-header" ref={barRef}>
      <div className="dash-header__inner">
        <Link href="/" className="dash-brand" aria-label="WINJO DIGITAL home">
          <Logo />
        </Link>
        <nav className="dash-nav" aria-label={variant === "staff" ? "Staff dashboard" : "Your account"}>
          {groups.map((group, i) =>
            group.href ? (
              <a key={group.label} href={group.href} className="dash-nav__button dash-nav__link" aria-current={isHere(group.href) ? "page" : undefined} onClick={close}>
                {group.label}
              </a>
            ) : (
              <div key={group.label} className="dash-nav__group">
                <button
                  type="button"
                  className="dash-nav__button"
                  aria-expanded={openGroup === i}
                  aria-controls={`dash-menu-${i}`}
                  data-current={group.items.some((item) => isHere(item.href)) ? "" : undefined}
                  onClick={() => setOpenGroup(openGroup === i ? null : i)}
                >
                  {group.label}
                  <Chevron open={openGroup === i} />
                </button>
                {openGroup === i && (
                  <div id={`dash-menu-${i}`} className="dash-menu">
                    {group.items.map((item) => (
                      <a key={item.label} href={item.href} className="dash-menu__item" aria-current={isHere(item.href) ? "page" : undefined} onClick={close}>
                        <span className="dash-menu__label">{item.label}</span>
                        <span className="dash-menu__hint">{item.hint}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ),
          )}
        </nav>

        <div className="dash-header__end">
          {variant === "customer" && <NotificationsBell />}
          <div className="dash-header__account"><AccountMenu /></div>
          <button type="button" className="dash-mobile-toggle" aria-expanded={mobileOpen} aria-controls="dash-mobile-menu" onClick={() => setMobileOpen((v) => !v)}>
            <span className="dash-mobile-toggle__bars" aria-hidden="true" />
            <span className="visually-hidden">Menu</span>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav id="dash-mobile-menu" className="dash-mobile" aria-label={variant === "staff" ? "Staff dashboard" : "Your account"}>
          {groups.map((group) =>
            group.href ? (
              <a key={group.label} href={group.href} className="dash-mobile__item dash-mobile__item--top" aria-current={isHere(group.href) ? "page" : undefined} onClick={close}>
                {group.label}
              </a>
            ) : (
              <div key={group.label} className="dash-mobile__group">
                <p className="dash-mobile__title">{group.label}</p>
                {group.items.map((item) => (
                  <a key={item.label} href={item.href} className="dash-mobile__item" aria-current={isHere(item.href) ? "page" : undefined} onClick={close}>
                    {item.label}
                  </a>
                ))}
              </div>
            ),
          )}
          <button type="button" className="dash-mobile__signout" onClick={() => { close(); void supabase()?.auth.signOut(); }}>
            Sign out
          </button>
        </nav>
      )}
    </header>
  );
}
