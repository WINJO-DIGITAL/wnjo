"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AccountMenu } from "@/components/account/AccountMenu";
import { NotificationsBell } from "@/components/account/NotificationsBell";
import { Logo } from "@/components/Logo";

type DashItem = { label: string; hint: string; href: string };
type DashGroup = { label: string; items: DashItem[] };

/** Client dashboard sections. Items jump to the matching part of the page. */
const CUSTOMER: DashGroup[] = [
  {
    label: "Your project",
    items: [
      { label: "Progress", hint: "Where your website is now", href: "/account#progress" },
      { label: "Approvals", hint: "Designs waiting for your say", href: "/account#approvals" },
      { label: "Messages", hint: "Talk to the team", href: "/account#projects" },
    ],
  },
  {
    label: "Quotes & payments",
    items: [
      { label: "Your quotes", hint: "Accept or decline", href: "/account#quotes" },
      { label: "Deposit", hint: "Pay or check your deposit", href: "/account#quotes" },
    ],
  },
  {
    label: "Help",
    items: [
      { label: "Contact us", hint: "Ask us anything", href: "/contact" },
      { label: "FAQ", hint: "Quick answers", href: "/faq" },
    ],
  },
];

/** Staff dashboard sections. Items switch the admin view (it listens for the address hash). */
const STAFF: DashGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Today", hint: "What needs you now", href: "/admin#overview" }],
  },
  {
    label: "Sales",
    items: [
      { label: "Enquiries", hint: "New leads from the site", href: "/admin#enquiries" },
      { label: "Quotes", hint: "Sent, accepted and declined", href: "/admin#quotes" },
      { label: "Website builds", hint: "Briefs, approvals and proposals", href: "/admin#builds" },
      { label: "Subscriptions", hint: "Monthly websites, payments and ownership", href: "/admin#subscriptions" },
    ],
  },
  {
    label: "Delivery",
    items: [
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
        {variant === "staff" && <span className="dash-badge">Staff</span>}

        {variant === "staff" && (
        <nav className="dash-nav" aria-label="Staff dashboard">
          {groups.map((group, i) => (
            <div key={group.label} className="dash-nav__group">
              <button
                type="button"
                className="dash-nav__button"
                aria-expanded={openGroup === i}
                aria-controls={`dash-menu-${i}`}
                onClick={() => setOpenGroup(openGroup === i ? null : i)}
              >
                {group.label}
                <Chevron open={openGroup === i} />
              </button>
              {openGroup === i && (
                <div id={`dash-menu-${i}`} className="dash-menu">
                  {group.items.map((item) => (
                    <a key={item.label} href={item.href} className="dash-menu__item" onClick={close}>
                      <span className="dash-menu__label">{item.label}</span>
                      <span className="dash-menu__hint">{item.hint}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        )}

        <div className="dash-header__end">
          {variant === "customer" && <NotificationsBell />}
          <AccountMenu />
          {variant === "staff" && <button
            type="button"
            className="dash-mobile-toggle"
            aria-expanded={mobileOpen}
            aria-controls="dash-mobile-menu"
            onClick={() => setMobileOpen((v) => !v)}
          >
            Menu
          </button>}
        </div>
      </div>

      {variant === "staff" && mobileOpen && (
        <div id="dash-mobile-menu" className="dash-mobile">
          {groups.map((group) => (
            <div key={group.label} className="dash-mobile__group">
              <p className="dash-mobile__title">{group.label}</p>
              {group.items.map((item) => (
                <a key={item.label} href={item.href} className="dash-menu__item" onClick={close}>
                  <span className="dash-menu__label">{item.label}</span>
                  <span className="dash-menu__hint">{item.hint}</span>
                </a>
              ))}
            </div>
          ))}
        </div>
      )}
    </header>
  );
}
